namespace Backend.Models;

/// <summary>One user's usage counters for one calendar month. A new row is created
/// (or upserted) as the month rolls over; plan-limit checks read the current month's row.</summary>
public class UsageRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>First day of the month this row covers, e.g. 2026-09-01. Unique per (UserId, Month).</summary>
    public DateOnly Month { get; set; }

    public int QuestionsUsed { get; set; }
    public int DocumentsUsed { get; set; }
    public long StorageUsedBytes { get; set; }
    public int ChunksUsed { get; set; }
    public int KnowledgeBasesUsed { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
