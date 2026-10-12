using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using LexiSync.Application.Auth;
using Microsoft.IdentityModel.JsonWebTokens;

namespace LexiSync.Api.Endpoints;

public static class AuthEndpoints
{
    private const int MinPasswordLength = 8;

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth");

        group.MapPost("/register", async (RegisterRequest request, IAuthService auth, CancellationToken ct) =>
        {
            var errors = Validate(request.Email, request.Password, checkPasswordLength: true);
            if (errors.Count > 0)
                return Results.ValidationProblem(errors);

            var response = await auth.RegisterAsync(request, ct);
            return response is null
                ? Results.Problem("This email is already registered.", statusCode: StatusCodes.Status409Conflict)
                : Results.Ok(response);
        });

        group.MapPost("/login", async (LoginRequest request, IAuthService auth, CancellationToken ct) =>
        {
            var errors = Validate(request.Email, request.Password, checkPasswordLength: false);
            if (errors.Count > 0)
                return Results.ValidationProblem(errors);

            var response = await auth.LoginAsync(request, ct);
            // Same answer for "no such user" and "wrong password", so emails cannot be probed.
            return response is null
                ? Results.Problem("Invalid email or password.", statusCode: StatusCodes.Status401Unauthorized)
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
            email = user.FindFirstValue(JwtRegisteredClaimNames.Email)
        })).RequireAuthorization();
    }

    private static Dictionary<string, string[]> Validate(string? email, string? password, bool checkPasswordLength)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(email) || email.Length > 256 || !new EmailAddressAttribute().IsValid(email.Trim()))
            errors["email"] = ["A valid email address is required."];

        if (string.IsNullOrEmpty(password))
            errors["password"] = ["Password is required."];
        else if (checkPasswordLength && password.Length < MinPasswordLength)
            errors["password"] = [$"Password must be at least {MinPasswordLength} characters."];

        return errors;
    }
}
