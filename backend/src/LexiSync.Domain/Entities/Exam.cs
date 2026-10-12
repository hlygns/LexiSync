namespace LexiSync.Domain.Entities;

// Fixed reference data seeded on the server; never created on a device, so a plain int key is enough.
public class Exam
{
    public int Id { get; set; }

    // Stable identifier such as "YDS" or "YOKDIL_FEN".
    public required string Code { get; set; }
    public required string Name { get; set; }
}
