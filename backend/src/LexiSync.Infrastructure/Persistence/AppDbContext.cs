using LexiSync.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LexiSync.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<Deck> Decks => Set<Deck>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<ReviewState> ReviewStates => Set<ReviewState>();
    public DbSet<ReviewLog> ReviewLogs => Set<ReviewLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ProcessedChange> ProcessedChanges => Set<ProcessedChange>();
    public DbSet<QuizResult> QuizResults => Set<QuizResult>();
    public DbSet<PracticeResult> PracticeResults => Set<PracticeResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Source of ServerVersion: one counter shared by all synced tables, so a device
        // needs to remember a single number to ask "what changed since then".
        modelBuilder.HasSequence<long>("server_version_seq");

        modelBuilder.Entity<User>(user =>
        {
            // 256 because accounts created before usernames existed keep their email address here.
            user.Property(u => u.Username).HasMaxLength(256);
            user.HasIndex(u => u.Username).IsUnique();
            user.Property(u => u.Motivation).HasMaxLength(20);
            user.Property(u => u.DailyGoal).HasDefaultValue(User.DefaultDailyGoal);
        });

        modelBuilder.Entity<Exam>(exam =>
        {
            exam.Property(e => e.Code).HasMaxLength(32);
            exam.Property(e => e.Name).HasMaxLength(100);
            exam.HasIndex(e => e.Code).IsUnique();
            exam.HasData(
                new Exam { Id = 1, Code = "YDS", Name = "YDS" },
                new Exam { Id = 2, Code = "YOKDIL_FEN", Name = "YÖKDİL Fen Bilimleri" },
                new Exam { Id = 3, Code = "YOKDIL_SAGLIK", Name = "YÖKDİL Sağlık Bilimleri" },
                new Exam { Id = 4, Code = "YOKDIL_SOSYAL", Name = "YÖKDİL Sosyal Bilimler" });
        });

        modelBuilder.Entity<Deck>(deck =>
        {
            deck.Property(d => d.Name).HasMaxLength(100);
            deck.HasOne<User>().WithMany().HasForeignKey(d => d.UserId);
            // Restrict: an exam that still has decks cannot be deleted.
            deck.HasOne<Exam>().WithMany().HasForeignKey(d => d.ExamId).OnDelete(DeleteBehavior.Restrict);
            // Serves the pull query: this user's rows with ServerVersion > N.
            deck.HasIndex(d => new { d.UserId, d.ServerVersion });
        });

        modelBuilder.Entity<Card>(card =>
        {
            card.Property(c => c.Term).HasMaxLength(200);
            card.Property(c => c.Meaning).HasMaxLength(500);
            card.Property(c => c.Example).HasMaxLength(1000);
            card.HasOne<User>().WithMany().HasForeignKey(c => c.UserId);
            card.HasOne<Deck>().WithMany().HasForeignKey(c => c.DeckId);
            card.HasIndex(c => new { c.UserId, c.ServerVersion });
        });

        modelBuilder.Entity<ReviewState>(state =>
        {
            // One state row per card: the card's Id is both primary key and foreign key.
            state.HasKey(s => s.CardId);
            state.HasOne<Card>().WithOne().HasForeignKey<ReviewState>(s => s.CardId);
            // Serves the "cards due today" query: DueAt <= now.
            state.HasIndex(s => s.DueAt);
        });

        modelBuilder.Entity<ReviewLog>(log =>
        {
            log.HasOne<User>().WithMany().HasForeignKey(l => l.UserId);
            log.HasOne<Card>().WithMany().HasForeignKey(l => l.CardId);
            log.HasIndex(l => new { l.UserId, l.ServerVersion });
        });

        modelBuilder.Entity<QuizResult>(result =>
        {
            result.HasOne<User>().WithMany().HasForeignKey(r => r.UserId);
            result.HasOne<Deck>().WithMany().HasForeignKey(r => r.DeckId);
            result.HasIndex(r => new { r.UserId, r.ServerVersion });
        });

        modelBuilder.Entity<PracticeResult>(result =>
        {
            result.Property(r => r.Mode).HasMaxLength(20);
            result.HasOne<User>().WithMany().HasForeignKey(r => r.UserId);
            result.HasIndex(r => new { r.UserId, r.ServerVersion });
        });

        modelBuilder.Entity<RefreshToken>(token =>
        {
            token.Property(t => t.TokenHash).HasMaxLength(128);
            token.HasOne<User>().WithMany().HasForeignKey(t => t.UserId);
            token.HasIndex(t => t.TokenHash).IsUnique();
        });

        modelBuilder.Entity<ProcessedChange>(change =>
        {
            // The primary key is the idempotency guarantee: the same ChangeId cannot be stored twice.
            change.HasKey(c => c.ChangeId);
            change.HasOne<User>().WithMany().HasForeignKey(c => c.UserId);
        });
    }
}
