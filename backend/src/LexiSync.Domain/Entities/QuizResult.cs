namespace LexiSync.Domain.Entities;

// One finished unit test. Append-only like ReviewLog: never updated, so results from two devices just add up.
// A unit is the n-th group of 20 cards in a deck; passing its test unlocks the next unit.
public class QuizResult
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid DeckId { get; set; }
    public int UnitIndex { get; set; }
    public int Score { get; set; }
    public int Total { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public Guid DeviceId { get; set; }
    public long ServerVersion { get; set; }
}
