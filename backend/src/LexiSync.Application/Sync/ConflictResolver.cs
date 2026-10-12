namespace LexiSync.Application.Sync;

public enum ConflictDecision
{
    Apply,
    KeepExisting
}

// Decides what happens when a pushed row already exists on the server. Pure, so it is unit tested directly.
public static class ConflictResolver
{
    public static ConflictDecision Resolve(
        DateTimeOffset existingUpdatedAt,
        bool existingDeleted,
        DateTimeOffset incomingUpdatedAt,
        bool incomingDeleted)
    {
        // A delete always wins: a deleted row is never brought back by an edit...
        if (existingDeleted)
            return ConflictDecision.KeepExisting;

        // ...and an incoming delete is applied even if its timestamp is older.
        if (incomingDeleted)
            return ConflictDecision.Apply;

        // Otherwise last write wins, for the row as a whole.
        return incomingUpdatedAt > existingUpdatedAt ? ConflictDecision.Apply : ConflictDecision.KeepExisting;
    }
}
