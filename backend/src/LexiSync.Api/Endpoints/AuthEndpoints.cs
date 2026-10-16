using System.Security.Claims;
using System.Text.RegularExpressions;
using LexiSync.Application.Auth;
using LexiSync.Domain.Entities;
using LexiSync.Infrastructure.Auth;
using Microsoft.IdentityModel.JsonWebTokens;

namespace LexiSync.Api.Endpoints;

public static partial class AuthEndpoints
{
    private const int MinPasswordLength = 8;

    // 3-30 characters: lowercase letters, digits, dot and underscore.
    [GeneratedRegex("^[a-z0-9._]{3,30}$")]
    private static partial Regex UsernamePattern();

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth");

        group.MapPost("/register", async (RegisterRequest request, IAuthService auth, CancellationToken ct) =>
        {
            var errors = ValidateRegistration(request);
            if (errors.Count > 0)
                return Results.ValidationProblem(errors);

            var response = await auth.RegisterAsync(request, ct);
            return response is null
                ? Results.Problem("This username is already taken.", statusCode: StatusCodes.Status409Conflict)
                : Results.Ok(response);
        });

        group.MapPost("/login", async (LoginRequest request, IAuthService auth, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrEmpty(request.Password))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["username"] = ["Username and password are required."] });

            var response = await auth.LoginAsync(request, ct);
            // Same answer for "no such user" and "wrong password", so usernames cannot be probed.
            return response is null
                ? Results.Problem("Invalid username or password.", statusCode: StatusCodes.Status401Unauthorized)
                : Results.Ok(response);
        });

        group.MapPost("/refresh", async (RefreshRequest request, IAuthService auth, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["refreshToken"] = ["Refresh token is required."] });

            var response = await auth.RefreshAsync(request, ct);
            return response is null
                ? Results.Problem("Invalid or expired refresh token.", statusCode: StatusCodes.Status401Unauthorized)
                : Results.Ok(response);
        });

        // Requires a valid access token; returns who the token belongs to.
        group.MapGet("/me", (ClaimsPrincipal user) => Results.Ok(new
        {
            id = user.FindFirstValue(JwtRegisteredClaimNames.Sub),
            username = user.FindFirstValue(AuthService.UsernameClaim)
        })).RequireAuthorization();
    }

    private static Dictionary<string, string[]> ValidateRegistration(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        var username = request.Username?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(username) || !UsernamePattern().IsMatch(username))
            errors["username"] = ["Username must be 3-30 characters: letters, digits, '.' or '_'."];

        if (string.IsNullOrEmpty(request.Password) || request.Password.Length < MinPasswordLength)
            errors["password"] = [$"Password must be at least {MinPasswordLength} characters."];

        if (request.Motivation is not null && !User.Motivations.Contains(request.Motivation))
            errors["motivation"] = [$"Motivation must be one of: {string.Join(", ", User.Motivations)}."];

        if (request.DailyGoal is < 5 or > 200)
            errors["dailyGoal"] = ["Daily goal must be between 5 and 200 words."];

        return errors;
    }
}
