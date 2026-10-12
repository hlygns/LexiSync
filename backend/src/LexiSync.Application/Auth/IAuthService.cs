namespace LexiSync.Application.Auth;

public interface IAuthService
{
    // Returns null when the email is already registered.
    Task<AuthResponse?> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);

    // Returns null when the email or password is wrong.
    Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    // Returns null when the refresh token is unknown, already used or expired.
    Task<AuthResponse?> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken);
}
