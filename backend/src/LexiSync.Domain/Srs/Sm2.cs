using LexiSync.Domain.Entities;

namespace LexiSync.Domain.Srs;

// SM-2 spaced repetition. Pure: the result depends only on the arguments, no clock, no database.
public static class Sm2
{
    public const double InitialEaseFactor = 2.5;
    public const double MinEaseFactor = 1.3;

    public static Sm2State Review(Sm2State state, ReviewGrade grade)
    {
        var q = (int)grade;

        int repetitions;
        int intervalDays;

        if (q < 3)
        {
            // Forgotten: start over, see the card again tomorrow.
            repetitions = 0;
            intervalDays = 1;
        }
        else
        {
            intervalDays = state.Repetitions switch
            {
                0 => 1,
                1 => 6,
                // AwayFromZero matches JavaScript's Math.round, so the mobile port gives the same days.
                _ => (int)Math.Round(state.IntervalDays * state.EaseFactor, MidpointRounding.AwayFromZero)
            };
            repetitions = state.Repetitions + 1;
        }

        var easeFactor = state.EaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        easeFactor = Math.Max(easeFactor, MinEaseFactor);

        return new Sm2State(repetitions, intervalDays, easeFactor);
    }

    public static DateTimeOffset DueAt(Sm2State state, DateTimeOffset reviewedAt) =>
        reviewedAt.AddDays(state.IntervalDays);
}
