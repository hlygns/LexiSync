using System.Text.Json;

namespace LexiSync.Application.Sync;

public record DeckDto(Guid Id, int ExamId, string Name, DateTimeOffset UpdatedAt, DateTimeOffset? DeletedAt, long ServerVersion = 0);

public record CardDto(
    Guid Id,
    Guid DeckId,
    string Term,
    string Meaning,
    string? Example,
    List<string>? Tags,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long ServerVersion = 0);

public record ReviewLogDto(Guid Id, Guid CardId, int Grade, DateTimeOffset ReviewedAt, Guid DeviceId);

public record QuizResultDto(Guid Id, Guid DeckId, int UnitIndex, int Score, int Total, DateTimeOffset CompletedAt, Guid DeviceId);

public record PracticeResultDto(Guid Id, string Mode, int Score, int Total, DateTimeOffset CompletedAt, Guid DeviceId);

// One row from a device's outbox. Entity is "deck", "card", "reviewLog", "quizResult" or "practiceResult";
// Data is the matching DTO.
public record PushChange(Guid ChangeId, string Entity, JsonElement Data);

public record PushRequest(List<PushChange> Changes);

public static class PushStatus
{
    // Written to the database.
    public const string Applied = "applied";
    // This ChangeId was already processed earlier; nothing was done.
    public const string Duplicate = "duplicate";
    // Valid, but lost to a newer write or a delete on the server.
    public const string Ignored = "ignored";
    // Invalid or not allowed; will never succeed.
    public const string Rejected = "rejected";
}

// Whatever the status, the device may remove the change from its outbox: retrying cannot change the outcome.
public record PushResult(Guid ChangeId, string Status, string? Reason = null);

public record PushResponse(List<PushResult> Results);

public record PullResponse(
    long LatestVersion,
    List<DeckDto> Decks,
    List<CardDto> Cards,
    List<ReviewLogDto> ReviewLogs,
    List<QuizResultDto> QuizResults,
    List<PracticeResultDto> PracticeResults);
