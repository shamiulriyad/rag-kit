namespace Backend.Models;

/// <summary>A subscription tier and its limits. Seeded at startup from
/// <see cref="Backend.Data.PlanSeed"/> - mirrors frontend/src/lib/plan.ts exactly
/// so the UI's plan cards and the backend's limit checks never drift apart.</summary>
public class Plan
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Stable slug ("free" | "pro" | "team") - what <see cref="User.PlanId"/> ultimately resolves to.</summary>
    public PlanId Code { get; set; }

    public string Name { get; set; } = string.Empty;
    public decimal PriceMonthly { get; set; }
    public decimal PriceYearly { get; set; }

    public int MaxDocuments { get; set; }
    public long MaxStorageBytes { get; set; }
    public int MaxChunks { get; set; }
    public int MaxQuestionsPerMonth { get; set; }
    public int MaxKnowledgeBases { get; set; }

    public bool TeamWorkspaceEnabled { get; set; }
}
