using LexiSync.Application.Auth;
using LexiSync.Application.Sync;
using LexiSync.Domain.Entities;
using LexiSync.Infrastructure.Auth;
using LexiSync.Infrastructure.Persistence;
using LexiSync.Infrastructure.Sync;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LexiSync.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString, JwtOptions jwt)
    {
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        services.AddSingleton(jwt);
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISyncService, SyncService>();

        return services;
    }
}
