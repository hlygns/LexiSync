using System.Text;
using LexiSync.Api.Endpoints;
using LexiSync.Infrastructure;
using LexiSync.Infrastructure.Auth;
using LexiSync.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
    ?? throw new InvalidOperationException("Configuration section 'Jwt' is missing.");
if (string.IsNullOrEmpty(jwt.Key) || jwt.Key.Length < 32)
    throw new InvalidOperationException("'Jwt:Key' must be at least 32 characters.");

builder.Services.AddInfrastructure(connectionString, jwt);

// Every request carrying "Authorization: Bearer <token>" is checked against these rules.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep claim names as they are in the token ("sub", "email").
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// Create or update the tables on startup, so "docker compose up" is enough.
// Controlled by configuration: on in Development, opt-in elsewhere (Database__MigrateOnStartup=true).
if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseAuthentication();
app.UseAuthorization();

// Healthy only if the database is actually reachable, not merely if the process is running.
app.MapGet("/health", async (AppDbContext db) =>
    await db.Database.CanConnectAsync()
        ? Results.Ok(new { status = "healthy" })
        : Results.Json(new { status = "unhealthy" }, statusCode: StatusCodes.Status503ServiceUnavailable));

// Reference data; the mobile app keeps a local copy.
app.MapGet("/exams", async (AppDbContext db, CancellationToken ct) =>
    await db.Exams.AsNoTracking().OrderBy(e => e.Id).Select(e => new { e.Id, e.Code, e.Name }).ToListAsync(ct));

app.MapAuthEndpoints();
app.MapSyncEndpoints();

app.Run();

// Lets the integration tests start the API in-process (WebApplicationFactory<Program>).
public partial class Program;
