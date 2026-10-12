namespace LexiSync.Domain.Entities;

// Base for rows that are edited on devices and synchronized through the server.
public abstract class SyncEntity
{
    // Generated on the device (Guid v7), so a row created offline keeps its Id after sync.
    public Guid Id { get; set; }

    // Time of the last change on the device; used to pick the winner on conflict.
    public DateTimeOffset UpdatedAt { get; set; }

    // Assigned by the server on every write; answers "what changed since version N".
    public long ServerVersion { get; set; }

    // Tombstone: set instead of deleting the row, so other devices learn about the delete.
    public DateTimeOffset? DeletedAt { get; set; }

    public bool IsDeleted => DeletedAt is not null;
}
