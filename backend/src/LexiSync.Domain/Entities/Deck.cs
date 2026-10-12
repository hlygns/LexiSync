namespace LexiSync.Domain.Entities;

public class Deck : SyncEntity
{
    public Guid UserId { get; set; }
    public int ExamId { get; set; }
    public required string Name { get; set; }
}
