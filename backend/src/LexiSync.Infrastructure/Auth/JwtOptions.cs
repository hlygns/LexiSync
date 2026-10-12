namespace LexiSync.Infrastructure.Auth;

// Bound from the "Jwt" configuration section.
public class JwtOptions
{
    public required string Issuer { get; set; }
    public required string Audience { get; set; }

    // Secret used to sign access tokens (HMAC-SHA256); at least 32 characters.
    public required string Key { get; set; }

    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
}
