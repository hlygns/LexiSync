using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LexiSync.Application.Auth;

namespace LexiSync.IntegrationTests;

[Collection(ApiCollection.Name)]
public class AuthTests(ApiFactory factory)
{
    private readonly HttpClient _http = factory.CreateClient();

    private async Task<AuthResponse> RegisterAsync(string username)
    {
        var response = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(username, TestDevice.Password));
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
        var username = TestDevice.NewUsername();
        await RegisterAsync(username);

        var login = await _http.PostAsJsonAsync("/auth/login", new LoginRequest(username, TestDevice.Password));
        var auth = (await login.Content.ReadFromJsonAsync<AuthResponse>())!;

        var request = new HttpRequestMessage(HttpMethod.Get, "/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var me = await _http.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Contains(username, await me.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Registering_the_same_username_twice_is_a_conflict_even_with_different_casing()
    {
        var username = TestDevice.NewUsername();
        await RegisterAsync(username);

        var second = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(username.ToUpperInvariant(), TestDevice.Password));

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Theory]
    [InlineData("ab", "parola12345")]
    [InlineData("has space", "parola12345")]
    [InlineData("name@example.com", "parola12345")]
    [InlineData("valid_name", "short")]
    public async Task Invalid_registration_input_is_rejected(string username, string password)
    {
        var response = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(username, password));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_and_unknown_username_get_the_same_answer()
    {
        var username = TestDevice.NewUsername();
        await RegisterAsync(username);

        var wrongPassword = await _http.PostAsJsonAsync("/auth/login", new LoginRequest(username, "wrong-password"));
        var unknownUser = await _http.PostAsJsonAsync("/auth/login", new LoginRequest(TestDevice.NewUsername(), TestDevice.Password));

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownUser.StatusCode);
        Assert.Equal(await wrongPassword.Content.ReadAsStringAsync(), await unknownUser.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Sign_up_answers_are_saved_and_returned_with_every_login()
    {
        var username = TestDevice.NewUsername();
        var register = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(username, TestDevice.Password, "graduate", 30));
        var login = await _http.PostAsJsonAsync("/auth/login", new LoginRequest(username.ToUpperInvariant(), TestDevice.Password));

        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        var profile = (await login.Content.ReadFromJsonAsync<AuthResponse>())!.User;
        Assert.Equal(new UserProfile(username, "graduate", 30), profile);
    }

    [Fact]
    public async Task Without_sign_up_answers_the_daily_goal_defaults_to_twenty()
    {
        var auth = await RegisterAsync(TestDevice.NewUsername());

        Assert.Null(auth.User.Motivation);
        Assert.Equal(20, auth.User.DailyGoal);
    }

    [Theory]
    [InlineData("lottery", 20)]
    [InlineData("career", 0)]
    [InlineData("career", 500)]
    public async Task Unknown_motivation_or_impossible_daily_goal_is_rejected(string motivation, int dailyGoal)
    {
        var response = await _http.PostAsJsonAsync("/auth/register", new RegisterRequest(TestDevice.NewUsername(), TestDevice.Password, motivation, dailyGoal));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_token_works_once_and_returns_a_new_pair()
    {
        var auth = await RegisterAsync(TestDevice.NewUsername());

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
