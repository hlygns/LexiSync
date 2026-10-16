using System.Net.Http.Headers;
using System.Net.Http.Json;
using LexiSync.Application.Auth;
using LexiSync.Application.Sync;

namespace LexiSync.IntegrationTests;

// One signed-in device. Two TestDevices created for the same account behave like a phone and a tablet.
public class TestDevice(HttpClient http)
{
    public HttpClient Http { get; } = http;
    public Guid DeviceId { get; } = Guid.CreateVersion7();

    public const string Password = "parola12345";

    public static string NewUsername() => $"u_{Guid.NewGuid():N}"[..30];

    public static async Task<TestDevice> RegisterAsync(ApiFactory factory, string? username = null)
    {
        var http = factory.CreateClient();
        var response = await http.PostAsJsonAsync("/auth/register", new RegisterRequest(username ?? NewUsername(), Password));
        response.EnsureSuccessStatusCode();
        return await SignedInAsync(http, response);
    }

    public static async Task<TestDevice> LoginAsync(ApiFactory factory, string username)
    {
        var http = factory.CreateClient();
        var response = await http.PostAsJsonAsync("/auth/login", new LoginRequest(username, Password));
        response.EnsureSuccessStatusCode();
        return await SignedInAsync(http, response);
    }

    private static async Task<TestDevice> SignedInAsync(HttpClient http, HttpResponseMessage response)
    {
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return new TestDevice(http);
    }

    public async Task<PushResult> PushAsync(string entity, object data, Guid? changeId = null)
    {
        var results = await PushManyAsync((changeId ?? Guid.CreateVersion7(), entity, data));
        return results.Single();
    }

    public async Task<List<PushResult>> PushManyAsync(params (Guid ChangeId, string Entity, object Data)[] changes)
    {
        var body = new { changes = changes.Select(c => new { changeId = c.ChangeId, entity = c.Entity, data = c.Data }) };
        var response = await Http.PostAsJsonAsync("/sync/push", body);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PushResponse>())!.Results;
    }

    public async Task<PullResponse> PullAsync(long since = 0) =>
        (await Http.GetFromJsonAsync<PullResponse>($"/sync/pull?since={since}"))!;

    // Shortcuts that push a valid deck / card and return what was sent.
    public async Task<DeckDto> CreateDeckAsync(string name = "Akademik fiiller")
    {
        var deck = new DeckDto(Guid.CreateVersion7(), ExamId: 1, name, DateTimeOffset.UtcNow, DeletedAt: null);
        Assert.Equal(PushStatus.Applied, (await PushAsync("deck", deck)).Status);
        return deck;
    }

    public async Task<CardDto> CreateCardAsync(Guid deckId, string term = "abandon", string meaning = "terk etmek")
    {
        var card = new CardDto(Guid.CreateVersion7(), deckId, term, meaning, Example: null, Tags: ["fiil"], DateTimeOffset.UtcNow, DeletedAt: null);
        Assert.Equal(PushStatus.Applied, (await PushAsync("card", card)).Status);
        return card;
    }

    public ReviewLogDto NewReview(Guid cardId, int grade, DateTimeOffset reviewedAt) =>
        new(Guid.CreateVersion7(), cardId, grade, reviewedAt, DeviceId);
}
