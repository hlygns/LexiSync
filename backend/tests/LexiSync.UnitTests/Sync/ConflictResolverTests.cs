using LexiSync.Application.Sync;

namespace LexiSync.UnitTests.Sync;

public class ConflictResolverTests
{
    private static readonly DateTimeOffset Earlier = new(2026, 10, 12, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Earlier.AddMinutes(5);

    [Fact]
    public void Newer_edit_replaces_older_row()
    {
        var decision = ConflictResolver.Resolve(Earlier, existingDeleted: false, Later, incomingDeleted: false);

        Assert.Equal(ConflictDecision.Apply, decision);
    }

    [Fact]
    public void Older_edit_does_not_replace_newer_row()
    {
        var decision = ConflictResolver.Resolve(Later, existingDeleted: false, Earlier, incomingDeleted: false);

        Assert.Equal(ConflictDecision.KeepExisting, decision);
    }

    [Fact]
    public void Edit_with_the_same_timestamp_keeps_the_existing_row()
    {
        var decision = ConflictResolver.Resolve(Earlier, existingDeleted: false, Earlier, incomingDeleted: false);

        Assert.Equal(ConflictDecision.KeepExisting, decision);
    }

    [Fact]
    public void Delete_wins_even_when_it_is_older_than_the_existing_edit()
    {
        var decision = ConflictResolver.Resolve(Later, existingDeleted: false, Earlier, incomingDeleted: true);

        Assert.Equal(ConflictDecision.Apply, decision);
    }

    [Fact]
    public void Deleted_row_is_not_brought_back_by_a_newer_edit()
    {
        var decision = ConflictResolver.Resolve(Earlier, existingDeleted: true, Later, incomingDeleted: false);

        Assert.Equal(ConflictDecision.KeepExisting, decision);
    }

    [Fact]
    public void Deleting_an_already_deleted_row_changes_nothing()
    {
        var decision = ConflictResolver.Resolve(Earlier, existingDeleted: true, Later, incomingDeleted: true);

        Assert.Equal(ConflictDecision.KeepExisting, decision);
    }
}
