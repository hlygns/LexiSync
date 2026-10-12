using LexiSync.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");
builder.Services.AddInfrastructure(connectionString);

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
