namespace LexiSync.Domain.Srs;

// The three numbers SM-2 keeps per card. Immutable: a review produces a new state.
public readonly record struct Sm2State(int Repetitions, int IntervalDays, double EaseFactor)
{
    // A card that has never been reviewed.
    public static Sm2State Initial => new(Repetitions: 0, IntervalDays: 0, EaseFactor: Sm2.InitialEaseFactor);
}
