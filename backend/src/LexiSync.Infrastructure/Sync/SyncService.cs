using System.Text.Json;
using LexiSync.Application.Sync;
using LexiSync.Domain.Entities;
using LexiSync.Domain.Srs;
using LexiSync.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LexiSync.Infrastructure.Sync;

public class SyncService(AppDbContext db) : ISyncService
{
    public async Task<PushResponse> PushAsync(Guid userId, PushRequest request, CancellationToken cancellationToken)
    {
        // One transaction for the whole batch: a crash in the middle leaves nothing half-applied.
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // One push per user at a time (lock released at commit). Versions of a user's rows are therefore
        // committed in increasing order, so a pull can never skip a row that commits later with a lower version.
        var lockKey = BitConverter.ToInt64(userId.ToByteArray(), 8);
        await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({lockKey})", cancellationToken);

        var changeIds = request.Changes.Select(c => c.ChangeId).ToList();
        var processed = (await db.ProcessedChanges
            .Where(p => changeIds.Contains(p.ChangeId))
            .Select(p => p.ChangeId)
            .ToListAsync(cancellationToken)).ToHashSet();

        var results = new List<PushResult>();
        foreach (var change in request.Changes)
        {
            // Idempotency: this exact change was handled before (the device retried). Do nothing, answer again.
            if (!processed.Add(change.ChangeId))
            {
                results.Add(new PushResult(change.ChangeId, PushStatus.Duplicate));
                continue;
            }

            var (status, reason) = await ApplyAsync(userId, change, cancellationToken);
            db.ProcessedChanges.Add(new ProcessedChange
            {
                ChangeId = change.ChangeId,
                UserId = userId,
                ProcessedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync(cancellationToken);
            results.Add(new PushResult(change.ChangeId, status, reason));
        }

        await transaction.CommitAsync(cancellationToken);
        return new PushResponse(results);
    }

    public async Task<PullResponse> PullAsync(Guid userId, long since, CancellationToken cancellationToken)
    {
        var decks = await db.Decks.AsNoTracking()
            .Where(d => d.UserId == userId && d.ServerVersion > since)
            .OrderBy(d => d.ServerVersion)
            .Select(d => new DeckDto(d.Id, d.ExamId, d.Name, d.UpdatedAt, d.DeletedAt, d.ServerVersion))
            .ToListAsync(cancellationToken);

        var cards = await db.Cards.AsNoTracking()
            .Where(c => c.UserId == userId && c.ServerVersion > since)
            .OrderBy(c => c.ServerVersion)
            .Select(c => new CardDto(c.Id, c.DeckId, c.Term, c.Meaning, c.Example, c.Tags, c.UpdatedAt, c.DeletedAt, c.ServerVersion))
            .ToListAsync(cancellationToken);

        var logs = await db.ReviewLogs.AsNoTracking()
            .Where(l => l.UserId == userId && l.ServerVersion > since)
            .OrderBy(l => l.ServerVersion)
            .Select(l => new { Dto = new ReviewLogDto(l.Id, l.CardId, (int)l.Grade, l.ReviewedAt, l.DeviceId), l.ServerVersion })
            .ToListAsync(cancellationToken);

        var quizResults = await db.QuizResults.AsNoTracking()
            .Where(r => r.UserId == userId && r.ServerVersion > since)
            .OrderBy(r => r.ServerVersion)
            .Select(r => new { Dto = new QuizResultDto(r.Id, r.DeckId, r.UnitIndex, r.Score, r.Total, r.CompletedAt, r.DeviceId), r.ServerVersion })
            .ToListAsync(cancellationToken);

        var practiceResults = await db.PracticeResults.AsNoTracking()
            .Where(r => r.UserId == userId && r.ServerVersion > since)
            .OrderBy(r => r.ServerVersion)
            .Select(r => new { Dto = new PracticeResultDto(r.Id, r.Mode, r.Score, r.Total, r.CompletedAt, r.DeviceId), r.ServerVersion })
            .ToListAsync(cancellationToken);

        var latestVersion = new[]
        {
            since,
            decks.Count > 0 ? decks[^1].ServerVersion : 0,
            cards.Count > 0 ? cards[^1].ServerVersion : 0,
            logs.Count > 0 ? logs[^1].ServerVersion : 0,
            quizResults.Count > 0 ? quizResults[^1].ServerVersion : 0,
            practiceResults.Count > 0 ? practiceResults[^1].ServerVersion : 0
        }.Max();

        return new PullResponse(
            latestVersion,
            decks,
            cards,
            logs.Select(l => l.Dto).ToList(),
            quizResults.Select(r => r.Dto).ToList(),
            practiceResults.Select(r => r.Dto).ToList());
    }

    private async Task<(string Status, string? Reason)> ApplyAsync(Guid userId, PushChange change, CancellationToken cancellationToken)
    {
        try
        {
            return change.Entity switch
            {
                "deck" => await ApplyDeckAsync(userId, Deserialize<DeckDto>(change.Data), cancellationToken),
                "card" => await ApplyCardAsync(userId, Deserialize<CardDto>(change.Data), cancellationToken),
                "reviewLog" => await ApplyReviewLogAsync(userId, Deserialize<ReviewLogDto>(change.Data), cancellationToken),
                "quizResult" => await ApplyQuizResultAsync(userId, Deserialize<QuizResultDto>(change.Data), cancellationToken),
                "practiceResult" => await ApplyPracticeResultAsync(userId, Deserialize<PracticeResultDto>(change.Data), cancellationToken),
                _ => (PushStatus.Rejected, $"Unknown entity '{change.Entity}'.")
            };
        }
        catch (JsonException)
        {
            return (PushStatus.Rejected, "Data does not match the entity.");
        }
    }

    private async Task<(string, string?)> ApplyDeckAsync(Guid userId, DeckDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Length > 100)
            return (PushStatus.Rejected, "Deck name is required (max 100 characters).");
        if (!await db.Exams.AnyAsync(e => e.Id == dto.ExamId, cancellationToken))
            return (PushStatus.Rejected, "Unknown exam.");

        var updatedAt = dto.UpdatedAt.ToUniversalTime();
        var deletedAt = dto.DeletedAt?.ToUniversalTime();

        var existing = await db.Decks.FindAsync([dto.Id], cancellationToken);
        if (existing is null)
        {
            db.Decks.Add(new Deck
            {
                Id = dto.Id,
                UserId = userId,
                ExamId = dto.ExamId,
                Name = dto.Name,
                UpdatedAt = updatedAt,
                DeletedAt = deletedAt,
                ServerVersion = await NextVersionAsync(cancellationToken)
            });
            return (PushStatus.Applied, null);
        }

        if (existing.UserId != userId)
            return (PushStatus.Rejected, "Deck belongs to another user.");

        var decision = ConflictResolver.Resolve(existing.UpdatedAt, existing.IsDeleted, updatedAt, deletedAt is not null);
        if (decision == ConflictDecision.KeepExisting)
            return (PushStatus.Ignored, "A newer version or a delete already exists on the server.");

        existing.ExamId = dto.ExamId;
        existing.Name = dto.Name;
        existing.UpdatedAt = updatedAt;
        existing.DeletedAt = deletedAt;
        existing.ServerVersion = await NextVersionAsync(cancellationToken);

        if (deletedAt is not null)
        {
            // Deleting a deck deletes its cards, including ones created on a device that never saw the delete.
            var cards = await db.Cards.Where(c => c.DeckId == existing.Id && c.DeletedAt == null).ToListAsync(cancellationToken);
            foreach (var card in cards)
            {
                card.DeletedAt = deletedAt;
                card.UpdatedAt = updatedAt;
                card.ServerVersion = await NextVersionAsync(cancellationToken);
            }
        }

        return (PushStatus.Applied, null);
    }

    private async Task<(string, string?)> ApplyCardAsync(Guid userId, CardDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Term) || dto.Term.Length > 200)
            return (PushStatus.Rejected, "Term is required (max 200 characters).");
        if (string.IsNullOrWhiteSpace(dto.Meaning) || dto.Meaning.Length > 500)
            return (PushStatus.Rejected, "Meaning is required (max 500 characters).");
        if (dto.Example is { Length: > 1000 })
            return (PushStatus.Rejected, "Example is too long (max 1000 characters).");

        var deck = await db.Decks.FindAsync([dto.DeckId], cancellationToken);
        if (deck is null || deck.UserId != userId)
            return (PushStatus.Rejected, "Unknown deck.");

        var updatedAt = dto.UpdatedAt.ToUniversalTime();
        // A card arriving for an already deleted deck is stored as deleted too.
        var deletedAt = dto.DeletedAt?.ToUniversalTime() ?? deck.DeletedAt;

        var existing = await db.Cards.FindAsync([dto.Id], cancellationToken);
        if (existing is null)
        {
            db.Cards.Add(new Card
            {
                Id = dto.Id,
                UserId = userId,
                DeckId = dto.DeckId,
                Term = dto.Term,
                Meaning = dto.Meaning,
                Example = dto.Example,
                Tags = dto.Tags ?? [],
                UpdatedAt = updatedAt,
                DeletedAt = deletedAt,
                ServerVersion = await NextVersionAsync(cancellationToken)
            });
            return (PushStatus.Applied, null);
        }

        if (existing.UserId != userId)
            return (PushStatus.Rejected, "Card belongs to another user.");

        var decision = ConflictResolver.Resolve(existing.UpdatedAt, existing.IsDeleted, updatedAt, deletedAt is not null);
        if (decision == ConflictDecision.KeepExisting)
            return (PushStatus.Ignored, "A newer version or a delete already exists on the server.");

        existing.DeckId = dto.DeckId;
        existing.Term = dto.Term;
        existing.Meaning = dto.Meaning;
        existing.Example = dto.Example;
        existing.Tags = dto.Tags ?? [];
        existing.UpdatedAt = updatedAt;
        existing.DeletedAt = deletedAt;
        existing.ServerVersion = await NextVersionAsync(cancellationToken);
        return (PushStatus.Applied, null);
    }

    private async Task<(string, string?)> ApplyReviewLogAsync(Guid userId, ReviewLogDto dto, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined((ReviewGrade)dto.Grade))
            return (PushStatus.Rejected, "Grade must be 1, 3, 4 or 5.");

        var card = await db.Cards.FindAsync([dto.CardId], cancellationToken);
        if (card is null || card.UserId != userId)
            return (PushStatus.Rejected, "Unknown card.");

        // Logs are append-only: an existing Id is never changed.
        if (await db.ReviewLogs.FindAsync([dto.Id], cancellationToken) is not null)
            return (PushStatus.Ignored, "Review log already exists.");

        db.ReviewLogs.Add(new ReviewLog
        {
            Id = dto.Id,
            UserId = userId,
            CardId = dto.CardId,
            Grade = (ReviewGrade)dto.Grade,
            ReviewedAt = dto.ReviewedAt.ToUniversalTime(),
            DeviceId = dto.DeviceId,
            ServerVersion = await NextVersionAsync(cancellationToken)
        });
        await db.SaveChangesAsync(cancellationToken);

        await RebuildReviewStateAsync(dto.CardId, cancellationToken);
        return (PushStatus.Applied, null);
    }

    private async Task<(string, string?)> ApplyQuizResultAsync(Guid userId, QuizResultDto dto, CancellationToken cancellationToken)
    {
        if (dto.UnitIndex < 0 || dto.Total is < 1 or > 100 || dto.Score < 0 || dto.Score > dto.Total)
            return (PushStatus.Rejected, "Unit index, score or total is out of range.");

        var deck = await db.Decks.FindAsync([dto.DeckId], cancellationToken);
        if (deck is null || deck.UserId != userId)
            return (PushStatus.Rejected, "Unknown deck.");

        // Append-only, like review logs.
        if (await db.QuizResults.FindAsync([dto.Id], cancellationToken) is not null)
            return (PushStatus.Ignored, "Quiz result already exists.");

        db.QuizResults.Add(new QuizResult
        {
            Id = dto.Id,
            UserId = userId,
            DeckId = dto.DeckId,
            UnitIndex = dto.UnitIndex,
            Score = dto.Score,
            Total = dto.Total,
            CompletedAt = dto.CompletedAt.ToUniversalTime(),
            DeviceId = dto.DeviceId,
            ServerVersion = await NextVersionAsync(cancellationToken)
        });
        return (PushStatus.Applied, null);
    }

    private async Task<(string, string?)> ApplyPracticeResultAsync(Guid userId, PracticeResultDto dto, CancellationToken cancellationToken)
    {
        if (!PracticeResult.Modes.Contains(dto.Mode))
            return (PushStatus.Rejected, "Unknown practice mode.");
        if (dto.Total is < 1 or > 100 || dto.Score < 0 || dto.Score > dto.Total)
            return (PushStatus.Rejected, "Score or total is out of range.");

        // Append-only. An Id that already exists is left alone, whoever owns it.
        if (await db.PracticeResults.FindAsync([dto.Id], cancellationToken) is not null)
            return (PushStatus.Ignored, "Practice result already exists.");

        db.PracticeResults.Add(new PracticeResult
        {
            Id = dto.Id,
            UserId = userId,
            Mode = dto.Mode,
            Score = dto.Score,
            Total = dto.Total,
            CompletedAt = dto.CompletedAt.ToUniversalTime(),
            DeviceId = dto.DeviceId,
            ServerVersion = await NextVersionAsync(cancellationToken)
        });
        return (PushStatus.Applied, null);
    }

    // Replays every log of the card through SM-2, oldest first. Whatever order two devices push in,
    // the resulting state is the same, and no review is lost.
    private async Task RebuildReviewStateAsync(Guid cardId, CancellationToken cancellationToken)
    {
        var logs = await db.ReviewLogs.AsNoTracking()
            .Where(l => l.CardId == cardId)
            .OrderBy(l => l.ReviewedAt).ThenBy(l => l.Id)
            .Select(l => new { l.Grade, l.ReviewedAt })
            .ToListAsync(cancellationToken);

        var sm2 = logs.Aggregate(Sm2State.Initial, (state, log) => Sm2.Review(state, log.Grade));

        var reviewState = await db.ReviewStates.FindAsync([cardId], cancellationToken);
        if (reviewState is null)
        {
            reviewState = new ReviewState { CardId = cardId };
            db.ReviewStates.Add(reviewState);
        }

        reviewState.EaseFactor = sm2.EaseFactor;
        reviewState.IntervalDays = sm2.IntervalDays;
        reviewState.Repetitions = sm2.Repetitions;
        reviewState.DueAt = Sm2.DueAt(sm2, logs[^1].ReviewedAt);
    }

    private async Task<long> NextVersionAsync(CancellationToken cancellationToken) =>
        await db.Database
            .SqlQuery<long>($"SELECT nextval('server_version_seq') AS \"Value\"")
            .SingleAsync(cancellationToken);

    private static T Deserialize<T>(JsonElement data) =>
        data.Deserialize<T>(JsonSerializerOptions.Web) ?? throw new JsonException("Data is null.");
}
