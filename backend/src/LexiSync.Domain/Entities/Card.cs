namespace LexiSync.Domain.Entities;

public class Card : SyncEntity
{
    public Guid DeckId { get; set; }
    public required string Term { get; set; }
    public required string Meaning { get; set; }
    public string? Example { get; set; }
    public List<string> Tags { get; set; } = [];
}
