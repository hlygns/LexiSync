using System.Security.Claims;
using LexiSync.Application.Sync;
using Microsoft.IdentityModel.JsonWebTokens;

namespace LexiSync.Api.Endpoints;

public static class SyncEndpoints
{
    private const int MaxChangesPerPush = 500;

    public static void MapSyncEndpoints(this IEndpointRouteBuilder app)
    {
        // The user is always taken from the access token, never from the request body.
        var group = app.MapGroup("/sync").RequireAuthorization();

        group.MapPost("/push", async (PushRequest request, ClaimsPrincipal user, ISyncService sync, CancellationToken ct) =>
        {
            if (request.Changes is null || request.Changes.Count > MaxChangesPerPush)
                return Results.Problem($"Send between 0 and {MaxChangesPerPush} changes.", statusCode: StatusCodes.Status400BadRequest);

            return Results.Ok(await sync.PushAsync(GetUserId(user), request, ct));
        });

        group.MapGet("/pull", async (long? since, ClaimsPrincipal user, ISyncService sync, CancellationToken ct) =>
            Results.Ok(await sync.PullAsync(GetUserId(user), since ?? 0, ct)));
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
}
