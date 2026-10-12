namespace LexiSync.Domain.Entities;

// One row per review. Append-only: never updated or deleted, so logs from two devices merge without conflict.
public class ReviewLog
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public ReviewGrade Grade { get; set; }
    public DateTimeOffset ReviewedAt { get; set; }
    public Guid DeviceId { get; set; }
    public long ServerVersion { get; set; }
}
