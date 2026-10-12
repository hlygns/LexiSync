using LexiSync.Application.Sync;
using LexiSync.Domain.Entities;
using LexiSync.Domain.Srs;
using LexiSync.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LexiSync.IntegrationTests;

[Collection(ApiCollection.Name)]
public class SyncTests(ApiFactory factory)
{
    // A phone and a tablet signed in to the same new account.
    private async Task<(TestDevice Phone, TestDevice Tablet)> TwoDevicesAsync()
    {
        var email = TestDevice.NewEmail();
        var phone = await TestDevice.RegisterAsync(factory, email);
        var tablet = await TestDevice.LoginAsync(factory, email);
        return (phone, tablet);
    }

    [Fact]
    public async Task Change_pushed_from_one_device_is_pulled_by_the_other()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync("YDS kelimeleri");
        var card = await phone.CreateCardAsync(deck.Id, "abandon", "terk etmek");

        var pulled = await tablet.PullAsync();

        Assert.Equal("YDS kelimeleri", Assert.Single(pulled.Decks).Name);
        var pulledCard = Assert.Single(pulled.Cards);
        Assert.Equal(card.Id, pulledCard.Id);
        Assert.Equal("terk etmek", pulledCard.Meaning);
        Assert.Equal(["fiil"], pulledCard.Tags);
    }

    [Fact]
    public async Task Pull_returns_only_what_changed_since_the_given_version()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        await phone.CreateCardAsync(deck.Id, "first");
        var firstPull = await tablet.PullAsync();

        var nothingNew = await tablet.PullAsync(firstPull.LatestVersion);
        await phone.CreateCardAsync(deck.Id, "second");
        var secondPull = await tablet.PullAsync(firstPull.LatestVersion);

        Assert.Empty(nothingNew.Decks);
        Assert.Empty(nothingNew.Cards);
        Assert.Equal(firstPull.LatestVersion, nothingNew.LatestVersion);
        Assert.Empty(secondPull.Decks);
        Assert.Equal("second", Assert.Single(secondPull.Cards).Term);
        Assert.True(secondPull.LatestVersion > firstPull.LatestVersion);
    }

    [Fact]
    public async Task Same_change_sent_twice_is_applied_once()
    {
        var phone = await TestDevice.RegisterAsync(factory);
        var deck = new DeckDto(Guid.CreateVersion7(), 1, "Tek deste", DateTimeOffset.UtcNow, null);
        var changeId = Guid.CreateVersion7();

        var first = await phone.PushAsync("deck", deck, changeId);
        var versionAfterFirst = (await phone.PullAsync()).LatestVersion;
        // The network dropped the answer, so the device retries with the same ChangeId.
        var second = await phone.PushAsync("deck", deck, changeId);
        var pulled = await phone.PullAsync();

        Assert.Equal(PushStatus.Applied, first.Status);
        Assert.Equal(PushStatus.Duplicate, second.Status);
        Assert.Single(pulled.Decks);
        Assert.Equal(versionAfterFirst, pulled.LatestVersion);
    }

    [Fact]
    public async Task Two_devices_edit_the_same_card_and_the_later_edit_wins()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        var card = await phone.CreateCardAsync(deck.Id, "abandon", "terk etmek");

        // Both edit while offline; the tablet's edit is made later but reaches the server first.
        var phoneEdit = card with { Meaning = "telefonda yazılan", UpdatedAt = card.UpdatedAt.AddMinutes(1) };
        var tabletEdit = card with { Meaning = "tablette yazılan", UpdatedAt = card.UpdatedAt.AddMinutes(2) };

        var tabletResult = await tablet.PushAsync("card", tabletEdit);
        var phoneResult = await phone.PushAsync("card", phoneEdit);

        Assert.Equal(PushStatus.Applied, tabletResult.Status);
        Assert.Equal(PushStatus.Ignored, phoneResult.Status);
        // The phone learns the winning version on its next pull.
        Assert.Equal("tablette yazılan", Assert.Single((await phone.PullAsync()).Cards).Meaning);
    }

    [Fact]
    public async Task Later_edit_wins_regardless_of_arrival_order()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        var card = await phone.CreateCardAsync(deck.Id);

        var older = card with { Meaning = "eski", UpdatedAt = card.UpdatedAt.AddMinutes(1) };
        var newer = card with { Meaning = "yeni", UpdatedAt = card.UpdatedAt.AddMinutes(2) };

        Assert.Equal(PushStatus.Applied, (await phone.PushAsync("card", older)).Status);
        Assert.Equal(PushStatus.Applied, (await tablet.PushAsync("card", newer)).Status);

        Assert.Equal("yeni", Assert.Single((await phone.PullAsync()).Cards).Meaning);
    }

    [Fact]
    public async Task Delete_wins_over_a_later_edit()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        var card = await phone.CreateCardAsync(deck.Id);

        var deletedOnPhone = card with { UpdatedAt = card.UpdatedAt.AddMinutes(1), DeletedAt = card.UpdatedAt.AddMinutes(1) };
        var editedLaterOnTablet = card with { Meaning = "geri gelmemeli", UpdatedAt = card.UpdatedAt.AddMinutes(5) };

        await phone.PushAsync("card", deletedOnPhone);
        var editResult = await tablet.PushAsync("card", editedLaterOnTablet);

        var pulled = Assert.Single((await tablet.PullAsync()).Cards);
        Assert.Equal(PushStatus.Ignored, editResult.Status);
        Assert.NotNull(pulled.DeletedAt);
        Assert.NotEqual("geri gelmemeli", pulled.Meaning);
    }

    [Fact]
    public async Task Delete_arriving_after_a_newer_edit_still_deletes()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        var card = await phone.CreateCardAsync(deck.Id);

        var editedOnTablet = card with { Meaning = "düzenlendi", UpdatedAt = card.UpdatedAt.AddMinutes(5) };
        var deletedEarlierOnPhone = card with { UpdatedAt = card.UpdatedAt.AddMinutes(1), DeletedAt = card.UpdatedAt.AddMinutes(1) };

        await tablet.PushAsync("card", editedOnTablet);
        var deleteResult = await phone.PushAsync("card", deletedEarlierOnPhone);

        Assert.Equal(PushStatus.Applied, deleteResult.Status);
        Assert.NotNull(Assert.Single((await tablet.PullAsync()).Cards).DeletedAt);
    }

    [Fact]
    public async Task Deleting_a_deck_deletes_its_cards_for_every_device()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        await phone.CreateCardAsync(deck.Id, "one");
        await tablet.CreateCardAsync(deck.Id, "two");
        var before = await tablet.PullAsync();

        var deletedAt = deck.UpdatedAt.AddMinutes(1);
        await phone.PushAsync("deck", deck with { UpdatedAt = deletedAt, DeletedAt = deletedAt });
        var after = await tablet.PullAsync(before.LatestVersion);

        Assert.NotNull(Assert.Single(after.Decks).DeletedAt);
        Assert.Equal(2, after.Cards.Count);
        Assert.All(after.Cards, card => Assert.NotNull(card.DeletedAt));
    }

    [Fact]
    public async Task Card_pushed_into_an_already_deleted_deck_is_stored_as_deleted()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        var deletedAt = deck.UpdatedAt.AddMinutes(1);
        await phone.PushAsync("deck", deck with { UpdatedAt = deletedAt, DeletedAt = deletedAt });

        // The tablet was offline, did not know about the delete and added a card.
        var card = new CardDto(Guid.CreateVersion7(), deck.Id, "late", "geç kalan", null, [], deck.UpdatedAt.AddMinutes(2), null);
        var result = await tablet.PushAsync("card", card);

        Assert.Equal(PushStatus.Applied, result.Status);
        Assert.NotNull(Assert.Single((await tablet.PullAsync()).Cards).DeletedAt);
    }

    [Fact]
    public async Task Reviews_from_two_devices_are_all_kept_and_replayed_in_time_order()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        var card = await phone.CreateCardAsync(deck.Id);
        var day = new DateTimeOffset(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);

        // Reviews happen in the order Good, Good, Hard, but reach the server out of order.
        var phoneFirst = phone.NewReview(card.Id, grade: 4, day);
        var tabletSecond = tablet.NewReview(card.Id, grade: 4, day.AddDays(1));
        var phoneThird = phone.NewReview(card.Id, grade: 3, day.AddDays(7));

        await tablet.PushAsync("reviewLog", tabletSecond);
        await phone.PushManyAsync(
            (Guid.CreateVersion7(), "reviewLog", phoneThird),
            (Guid.CreateVersion7(), "reviewLog", phoneFirst));

        var pulled = await tablet.PullAsync();
        Assert.Equal(3, pulled.ReviewLogs.Count);
        Assert.Equal(2, pulled.ReviewLogs.Select(l => l.DeviceId).Distinct().Count());

        var expected = new[] { ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Hard }.Aggregate(Sm2State.Initial, Sm2.Review);
        using var scope = factory.Services.CreateScope();
        var state = await scope.ServiceProvider.GetRequiredService<AppDbContext>().ReviewStates.SingleAsync(s => s.CardId == card.Id);
        Assert.Equal(expected.Repetitions, state.Repetitions);
        Assert.Equal(expected.IntervalDays, state.IntervalDays);
        Assert.Equal(expected.EaseFactor, state.EaseFactor, 10);
        Assert.Equal(day.AddDays(7).AddDays(expected.IntervalDays), state.DueAt);
    }

    [Fact]
    public async Task Same_review_log_pushed_under_a_new_change_id_is_not_stored_twice()
    {
        var phone = await TestDevice.RegisterAsync(factory);
        var deck = await phone.CreateDeckAsync();
        var card = await phone.CreateCardAsync(deck.Id);
        var log = phone.NewReview(card.Id, grade: 4, DateTimeOffset.UtcNow);

        var first = await phone.PushAsync("reviewLog", log);
        var second = await phone.PushAsync("reviewLog", log);

        Assert.Equal(PushStatus.Applied, first.Status);
        Assert.Equal(PushStatus.Ignored, second.Status);
        Assert.Single((await phone.PullAsync()).ReviewLogs);
    }

    [Fact]
    public async Task Unit_test_result_from_one_device_unlocks_the_unit_on_the_other()
    {
        var (phone, tablet) = await TwoDevicesAsync();
        var deck = await phone.CreateDeckAsync();
        var result = new QuizResultDto(Guid.CreateVersion7(), deck.Id, UnitIndex: 0, Score: 18, Total: 20, DateTimeOffset.UtcNow, phone.DeviceId);

        var first = await phone.PushAsync("quizResult", result);
        var again = await phone.PushAsync("quizResult", result);
        var pulled = await tablet.PullAsync();

        Assert.Equal(PushStatus.Applied, first.Status);
        Assert.Equal(PushStatus.Ignored, again.Status);
        var pulledResult = Assert.Single(pulled.QuizResults);
        Assert.Equal((deck.Id, 0, 18, 20), (pulledResult.DeckId, pulledResult.UnitIndex, pulledResult.Score, pulledResult.Total));
    }

    [Theory]
    [InlineData(-1, 10, 20)]
    [InlineData(0, 21, 20)]
    [InlineData(0, -1, 20)]
    [InlineData(0, 0, 0)]
    public async Task Unit_test_result_with_impossible_numbers_is_rejected(int unitIndex, int score, int total)
    {
        var phone = await TestDevice.RegisterAsync(factory);
        var deck = await phone.CreateDeckAsync();

        var result = await phone.PushAsync("quizResult", new QuizResultDto(Guid.CreateVersion7(), deck.Id, unitIndex, score, total, DateTimeOffset.UtcNow, phone.DeviceId));

        Assert.Equal(PushStatus.Rejected, result.Status);
        Assert.Empty((await phone.PullAsync()).QuizResults);
    }

    [Fact]
    public async Task One_user_cannot_see_or_change_another_users_data()
    {
        var owner = await TestDevice.RegisterAsync(factory);
        var stranger = await TestDevice.RegisterAsync(factory);
        var deck = await owner.CreateDeckAsync();
        var card = await owner.CreateCardAsync(deck.Id, "private", "özel");

        var strangerPull = await stranger.PullAsync();
        var overwriteCard = await stranger.PushAsync("card", card with { Meaning = "ele geçirildi", UpdatedAt = card.UpdatedAt.AddHours(1) });
        var overwriteDeck = await stranger.PushAsync("deck", deck with { Name = "ele geçirildi", UpdatedAt = deck.UpdatedAt.AddHours(1) });
        var addToDeck = await stranger.PushAsync("card", new CardDto(Guid.CreateVersion7(), deck.Id, "x", "y", null, [], DateTimeOffset.UtcNow, null));
        var review = await stranger.PushAsync("reviewLog", stranger.NewReview(card.Id, 4, DateTimeOffset.UtcNow));
        var quiz = await stranger.PushAsync("quizResult", new QuizResultDto(Guid.CreateVersion7(), deck.Id, 0, 20, 20, DateTimeOffset.UtcNow, stranger.DeviceId));

        Assert.Empty(strangerPull.Decks);
        Assert.Empty(strangerPull.Cards);
        Assert.All(new[] { overwriteCard, overwriteDeck, addToDeck, review, quiz }, r => Assert.Equal(PushStatus.Rejected, r.Status));
        var ownerPull = await owner.PullAsync();
        Assert.Equal("özel", Assert.Single(ownerPull.Cards).Meaning);
        Assert.Equal(deck.Name, Assert.Single(ownerPull.Decks).Name);
        Assert.Empty(ownerPull.ReviewLogs);
    }

    [Fact]
    public async Task Invalid_changes_are_rejected_without_blocking_the_valid_ones_in_the_same_push()
    {
        var phone = await TestDevice.RegisterAsync(factory);
        var deck = new DeckDto(Guid.CreateVersion7(), 1, "Geçerli deste", DateTimeOffset.UtcNow, null);

        var results = await phone.PushManyAsync(
            (Guid.CreateVersion7(), "deck", deck),
            (Guid.CreateVersion7(), "deck", deck with { Id = Guid.CreateVersion7(), Name = "" }),
            (Guid.CreateVersion7(), "deck", deck with { Id = Guid.CreateVersion7(), ExamId = 999 }),
            (Guid.CreateVersion7(), "card", new CardDto(Guid.CreateVersion7(), Guid.CreateVersion7(), "orphan", "sahipsiz", null, [], DateTimeOffset.UtcNow, null)),
            (Guid.CreateVersion7(), "planet", new { name = "Mars" }),
            (Guid.CreateVersion7(), "card", new { id = "not-a-guid" }));

        Assert.Equal(
            [PushStatus.Applied, PushStatus.Rejected, PushStatus.Rejected, PushStatus.Rejected, PushStatus.Rejected, PushStatus.Rejected],
            results.Select(r => r.Status));
        Assert.Equal("Geçerli deste", Assert.Single((await phone.PullAsync()).Decks).Name);
    }

    [Fact]
    public async Task Timestamps_with_a_local_offset_are_accepted()
    {
        var phone = await TestDevice.RegisterAsync(factory);
        var istanbulTime = new DateTimeOffset(2026, 10, 12, 12, 0, 0, TimeSpan.FromHours(3));

        var result = await phone.PushAsync("deck", new DeckDto(Guid.CreateVersion7(), 1, "Saat dilimi", istanbulTime, null));

        Assert.Equal(PushStatus.Applied, result.Status);
        Assert.Equal(istanbulTime, Assert.Single((await phone.PullAsync()).Decks).UpdatedAt);
    }
}
