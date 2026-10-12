using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LexiSync.Application.Auth;

namespace LexiSync.IntegrationTests;

[Collection(ApiCollection.Name)]
public class AuthTests(ApiFactory factory)
{
    private readonly HttpClient _http = factory.CreateClient();

    private async Task<AuthResponse> RegisterAsync(string email)
    {
        var response = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(email, TestDevice.Password));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    [Fact]
    public async Task Health_reports_healthy_when_database_is_reachable()
    {
        var response = await _http.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Exams_returns_the_seeded_reference_data()
    {
        var exams = await _http.GetFromJsonAsync<List<ExamRow>>("/exams");

        Assert.Equal(["YDS", "YOKDIL_FEN", "YOKDIL_SAGLIK", "YOKDIL_SOSYAL"], exams!.Select(e => e.Code));
    }

    private sealed record ExamRow(int Id, string Code, string Name);

    [Fact]
    public async Task Registered_user_can_log_in_and_call_a_protected_endpoint()
    {
        var email = TestDevice.NewEmail();
        await RegisterAsync(email);

        var login = await _http.PostAsJsonAsync("/auth/login", new LoginRequest(email, TestDevice.Password));
        var auth = (await login.Content.ReadFromJsonAsync<AuthResponse>())!;

        var request = new HttpRequestMessage(HttpMethod.Get, "/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var me = await _http.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Contains(email, await me.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Registering_the_same_email_twice_is_a_conflict_even_with_different_casing()
    {
        var email = TestDevice.NewEmail();
        await RegisterAsync(email);

        var second = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(email.ToUpperInvariant(), TestDevice.Password));

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Theory]
    [InlineData("not-an-email", "parola12345")]
    [InlineData("valid@example.com", "short")]
    public async Task Invalid_registration_input_is_rejected(string email, string password)
    {
        var response = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(email, password));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_and_unknown_email_get_the_same_answer()
    {
        var email = TestDevice.NewEmail();
        await RegisterAsync(email);

        var wrongPassword = await _http.PostAsJsonAsync("/auth/login", new LoginRequest(email, "wrong-password"));
        var unknownEmail = await _http.PostAsJsonAsync("/auth/login", new LoginRequest(TestDevice.NewEmail(), TestDevice.Password));

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownEmail.StatusCode);
        Assert.Equal(await wrongPassword.Content.ReadAsStringAsync(), await unknownEmail.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Refresh_token_works_once_and_returns_a_new_pair()
    {
        var auth = await RegisterAsync(TestDevice.NewEmail());

        var first = await _http.PostAsJsonAsync("/auth/refresh", new RefreshRequest(auth.RefreshToken));
        var second = await _http.PostAsJsonAsync("/auth/refresh", new RefreshRequest(auth.RefreshToken));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var rotated = (await first.Content.ReadFromJsonAsync<AuthResponse>())!;
        Assert.NotEqual(auth.RefreshToken, rotated.RefreshToken);
        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
    }

    [Theory]
    [InlineData("/auth/me")]
    [InlineData("/sync/pull")]
    public async Task Protected_endpoints_require_a_token(string path)
    {
        var response = await _http.GetAsync(path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
