using LexiSync.Domain.Entities;
using LexiSync.Domain.Srs;

namespace LexiSync.UnitTests.Srs;

public class Sm2Tests
{
    private const int Precision = 10;

    private static Sm2State ReviewAll(params ReviewGrade[] grades) =>
        grades.Aggregate(Sm2State.Initial, Sm2.Review);

    [Fact]
    public void Initial_state_has_default_ease_factor_and_no_repetitions()
    {
        Assert.Equal(new Sm2State(0, 0, 2.5), Sm2State.Initial);
    }

    [Fact]
    public void First_successful_review_is_due_in_one_day()
    {
        var state = ReviewAll(ReviewGrade.Good);

        Assert.Equal(1, state.Repetitions);
        Assert.Equal(1, state.IntervalDays);
    }

    [Fact]
    public void Second_successful_review_is_due_in_six_days()
    {
        var state = ReviewAll(ReviewGrade.Good, ReviewGrade.Good);

        Assert.Equal(2, state.Repetitions);
        Assert.Equal(6, state.IntervalDays);
    }

    [Fact]
    public void Third_successful_review_multiplies_interval_by_ease_factor()
    {
        var state = ReviewAll(ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Good);

        Assert.Equal(3, state.Repetitions);
        Assert.Equal(15, state.IntervalDays); // 6 * 2.5
    }

    [Fact]
    public void Intervals_grow_with_consecutive_good_reviews()
    {
        var state = Sm2State.Initial;
        var intervals = new List<int>();
        for (var i = 0; i < 5; i++)
        {
            state = Sm2.Review(state, ReviewGrade.Good);
            intervals.Add(state.IntervalDays);
        }

        // 15 * 2.5 = 37.5 rounds up to 38, then 38 * 2.5 = 95.
        Assert.Equal([1, 6, 15, 38, 95], intervals);
    }

    [Theory]
    [InlineData(ReviewGrade.Easy, 2.6)]
    [InlineData(ReviewGrade.Good, 2.5)]
    [InlineData(ReviewGrade.Hard, 2.36)]
    [InlineData(ReviewGrade.Again, 1.96)]
    public void Each_grade_changes_ease_factor_by_the_formula(ReviewGrade grade, double expected)
    {
        var state = Sm2.Review(Sm2State.Initial, grade);

        Assert.Equal(expected, state.EaseFactor, Precision);
    }

    [Fact]
    public void Hard_still_counts_as_a_successful_review()
    {
        var state = ReviewAll(ReviewGrade.Hard, ReviewGrade.Hard);

        Assert.Equal(2, state.Repetitions);
        Assert.Equal(6, state.IntervalDays);
    }

    [Fact]
    public void Again_resets_repetitions_and_schedules_tomorrow()
    {
        var state = ReviewAll(ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Again);

        Assert.Equal(0, state.Repetitions);
        Assert.Equal(1, state.IntervalDays);
    }

    [Fact]
    public void After_a_reset_the_card_climbs_the_ladder_again_with_its_lowered_ease_factor()
    {
        var state = ReviewAll(ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Again, ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Good);

        Assert.Equal(3, state.Repetitions);
        Assert.Equal(1.96, state.EaseFactor, Precision);
        Assert.Equal(12, state.IntervalDays); // 6 * 1.96 = 11.76
    }

    [Fact]
    public void Ease_factor_never_drops_below_minimum()
    {
        var state = ReviewAll(Enumerable.Repeat(ReviewGrade.Again, 20).ToArray());

        Assert.Equal(Sm2.MinEaseFactor, state.EaseFactor, Precision);
    }

    [Fact]
    public void Easy_reviews_keep_raising_ease_factor()
    {
        var state = ReviewAll(ReviewGrade.Easy, ReviewGrade.Easy, ReviewGrade.Easy);

        Assert.Equal(2.8, state.EaseFactor, Precision);
    }

    [Fact]
    public void Same_input_always_gives_same_output()
    {
        var input = new Sm2State(Repetitions: 4, IntervalDays: 38, EaseFactor: 2.2);

        Assert.Equal(Sm2.Review(input, ReviewGrade.Hard), Sm2.Review(input, ReviewGrade.Hard));
    }

    [Fact]
    public void Due_date_is_review_time_plus_interval()
    {
        var reviewedAt = new DateTimeOffset(2026, 10, 12, 9, 0, 0, TimeSpan.Zero);
        var state = ReviewAll(ReviewGrade.Good, ReviewGrade.Good);

        Assert.Equal(reviewedAt.AddDays(6), Sm2.DueAt(state, reviewedAt));
    }
}
