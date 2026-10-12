namespace LexiSync.Domain.Entities;

// Remembers every pushed change that was handled. If the same ChangeId arrives again
// (the device retried because it never saw the answer), it is not applied a second time.
public class ProcessedChange
{
    public Guid ChangeId { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset ProcessedAt { get; set; }
}
