# Stage 1: build with the full SDK image (large, contains the compiler).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the project files first: the restore layer is reused until a .csproj changes.
COPY src/LexiSync.Domain/LexiSync.Domain.csproj src/LexiSync.Domain/
COPY src/LexiSync.Application/LexiSync.Application.csproj src/LexiSync.Application/
COPY src/LexiSync.Infrastructure/LexiSync.Infrastructure.csproj src/LexiSync.Infrastructure/
COPY src/LexiSync.Api/LexiSync.Api.csproj src/LexiSync.Api/
RUN dotnet restore src/LexiSync.Api/LexiSync.Api.csproj

COPY src/ src/
RUN dotnet publish src/LexiSync.Api/LexiSync.Api.csproj -c Release -o /app/publish --no-restore

# Stage 2: run on the small runtime image; the SDK and source code are left behind.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Run as the image's built-in non-root user.
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "LexiSync.Api.dll"]
