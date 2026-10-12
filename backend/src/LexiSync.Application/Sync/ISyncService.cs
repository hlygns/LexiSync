namespace LexiSync.Application.Sync;

public interface ISyncService
{
    Task<PushResponse> PushAsync(Guid userId, PushRequest request, CancellationToken cancellationToken);

    // Everything of this user whose ServerVersion is greater than "since", tombstones included.
    Task<PullResponse> PullAsync(Guid userId, long since, CancellationToken cancellationToken);
}
