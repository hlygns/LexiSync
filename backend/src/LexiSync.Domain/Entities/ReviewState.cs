namespace LexiSync.Domain.Entities;

// Current SM-2 state of a card. One row per card; can be rebuilt from its ReviewLogs.
public class ReviewState
{
    public Guid CardId { get; set; }
    public double EaseFactor { get; set; } = 2.5;
    public int IntervalDays { get; set; }
    public int Repetitions { get; set; }
    public DateTimeOffset DueAt { get; set; }
}
