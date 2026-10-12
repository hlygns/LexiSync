using System.Buffers.Text;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LexiSync.Application.Auth;
using LexiSync.Domain.Entities;
using LexiSync.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

namespace LexiSync.Infrastructure.Auth;

public class AuthService(AppDbContext db, IPasswordHasher<User> passwordHasher, JwtOptions jwt) : IAuthService
{
    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (await db.Users.AnyAsync(u => u.Email == email, cancellationToken))
            return null;

        var user = new User
        {
            Id = Guid.CreateVersion7(),
            Email = email,
            PasswordHash = string.Empty,
            CreatedAt = DateTimeOffset.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        db.Users.Add(user);

        try
        {
            return await IssueTokensAsync(user, cancellationToken);
        }
        // Two registrations with the same email at the same moment: the unique index stops the second one.
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return null;
        }
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user is null)
            return null;

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return null;

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse?> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken)
    {
        var hash = HashToken(request.RefreshToken);
        var stored = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);
        if (stored is null)
            return null;

        // Rotation: a refresh token works once. It is deleted here and a new one is issued below.
        db.RefreshTokens.Remove(stored);

        try
        {
            if (stored.ExpiresAt <= DateTimeOffset.UtcNow)
            {
                await db.SaveChangesAsync(cancellationToken);
                return null;
            }

            var user = await db.Users.SingleAsync(u => u.Id == stored.UserId, cancellationToken);
            return await IssueTokensAsync(user, cancellationToken);
        }
        // The same token was used by two requests at once; the other one already deleted it.
        catch (DbUpdateConcurrencyException)
        {
            return null;
        }
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var accessTokenExpiresAt = now.AddMinutes(jwt.AccessTokenMinutes);

        var accessToken = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = jwt.Issuer,
            Audience = jwt.Audience,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email)
            ]),
            Expires = accessTokenExpiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                SecurityAlgorithms.HmacSha256)
        });

        // The refresh token is just a long random string; the client gets it, the database gets only its hash.
        var refreshToken = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            TokenHash = HashToken(refreshToken),
            ExpiresAt = now.AddDays(jwt.RefreshTokenDays)
        });

        await db.SaveChangesAsync(cancellationToken);
        return new AuthResponse(accessToken, accessTokenExpiresAt, refreshToken);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
