namespace LexiSync.Domain.Entities;

public class Card : SyncEntity
{
    // Copied from the deck's owner, so "everything of this user" needs no join.
    public Guid UserId { get; set; }
    public Guid DeckId { get; set; }
    public required string Term { get; set; }
    public required string Meaning { get; set; }
    public string? Example { get; set; }
    public List<string> Tags { get; set; } = [];
}
