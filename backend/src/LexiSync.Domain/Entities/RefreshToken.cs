namespace LexiSync.Domain.Entities;

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Only the hash is stored; a leaked database does not leak usable tokens.
    public required string TokenHash { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
