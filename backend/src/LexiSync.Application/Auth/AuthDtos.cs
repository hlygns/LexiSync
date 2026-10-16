namespace LexiSync.Application.Auth;

// Motivation and DailyGoal come from the sign-up cards; both are optional.
public record RegisterRequest(string Username, string Password, string? Motivation = null, int? DailyGoal = null);

public record LoginRequest(string Username, string Password);

public record RefreshRequest(string RefreshToken);

public record UserProfile(string Username, string? Motivation, int DailyGoal);

public record AuthResponse(string AccessToken, DateTimeOffset AccessTokenExpiresAt, string RefreshToken, UserProfile User);
