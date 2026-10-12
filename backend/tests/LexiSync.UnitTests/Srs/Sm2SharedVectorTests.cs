using System.Text.Json;
using LexiSync.Domain.Entities;
using LexiSync.Domain.Srs;

namespace LexiSync.UnitTests.Srs;

// The same file is run by the mobile app's Jest tests (mobile/src/srs/sm2.test.ts).
// If both suites pass, the C# and TypeScript implementations agree.
public class Sm2SharedVectorTests
{
    private sealed record Expected(int Repetitions, int IntervalDays, double EaseFactor);

    private sealed record Vector(string Name, int[] Grades, Expected Expected);

    public static TheoryData<string> VectorNames()
    {
        var data = new TheoryData<string>();
        foreach (var vector in Load())
            data.Add(vector.Name);
        return data;
    }

    [Theory]
    [MemberData(nameof(VectorNames))]
    public void Matches_shared_vector(string name)
    {
        var vector = Load().Single(v => v.Name == name);

        var state = vector.Grades.Aggregate(Sm2State.Initial, (s, grade) => Sm2.Review(s, (ReviewGrade)grade));

        Assert.Equal(vector.Expected.Repetitions, state.Repetitions);
        Assert.Equal(vector.Expected.IntervalDays, state.IntervalDays);
        Assert.Equal(vector.Expected.EaseFactor, state.EaseFactor, 10);
    }

    private static Vector[] Load()
    {
        var json = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "sm2-vectors.json"));
        return JsonSerializer.Deserialize<Vector[]>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
    }
}
