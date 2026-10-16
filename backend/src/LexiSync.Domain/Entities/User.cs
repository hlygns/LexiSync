namespace LexiSync.Domain.Entities;

public class User
{
    public static readonly string[] Motivations = ["academic", "graduate", "career", "abroad", "self"];
    public const int DefaultDailyGoal = 20;

    public Guid Id { get; set; }

    // Login name, stored lowercase. Accounts created before usernames existed have their email here.
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Asked once while signing up: why the user is preparing for YDS (one of Motivations)...
    public string? Motivation { get; set; }

    // ...and how many words a day they want to study.
    public int DailyGoal { get; set; } = DefaultDailyGoal;
}
