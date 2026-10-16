namespace LexiSync.Domain.Entities;

// One finished practice session (vocabulary test, cloze test, translation or the mixed general test).
// Append-only like ReviewLog; the list of these is the user's progress history.
public class PracticeResult
{
    public static readonly string[] Modes = ["vocab", "cloze", "translation", "general"];

    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public required string Mode { get; set; }
    public int Score { get; set; }
    public int Total { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public Guid DeviceId { get; set; }
    public long ServerVersion { get; set; }
}
