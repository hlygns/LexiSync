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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.Property(u => u.Email).HasMaxLength(256);
            user.HasIndex(u => u.Email).IsUnique();
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
            deck.HasIndex(d => d.ServerVersion);
        });

        modelBuilder.Entity<Card>(card =>
        {
            card.Property(c => c.Term).HasMaxLength(200);
            card.Property(c => c.Meaning).HasMaxLength(500);
            card.Property(c => c.Example).HasMaxLength(1000);
            card.HasOne<Deck>().WithMany().HasForeignKey(c => c.DeckId);
            card.HasIndex(c => c.ServerVersion);
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
            log.HasOne<Card>().WithMany().HasForeignKey(l => l.CardId);
            log.HasIndex(l => l.ServerVersion);
        });

        modelBuilder.Entity<RefreshToken>(token =>
        {
            token.Property(t => t.TokenHash).HasMaxLength(128);
            token.HasOne<User>().WithMany().HasForeignKey(t => t.UserId);
            token.HasIndex(t => t.TokenHash).IsUnique();
        });
    }
}
