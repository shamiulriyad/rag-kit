using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

/// <summary>Runs at startup (see Program.cs). Applies pending migrations and seeds the
/// Plan lookup table - reference data the app cannot function without, not "fake
/// production data" (spec section 32 only forbids the latter; demo users/Knowledge
/// Bases/documents are gated separately behind Seed:Development and left empty by default).</summary>
public static class DbInitializer
{
    public static async Task MigrateAndSeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);
        await SeedPlansAsync(db, ct);
    }

    private static async Task SeedPlansAsync(AppDbContext db, CancellationToken ct)
    {
        // Mirrors frontend/src/lib/plan.ts PLANS exactly - keep the two in sync.
        var wanted = new[]
        {
            new Plan
            {
                Code = PlanId.Free, Name = "Free",
                PriceMonthly = 0m, PriceYearly = 0m,
                MaxDocuments = 3, MaxStorageBytes = 500L * 1024 * 1024, MaxChunks = 5_000,
                MaxQuestionsPerMonth = 100, MaxKnowledgeBases = 1, TeamWorkspaceEnabled = false,
            },
            new Plan
            {
                Code = PlanId.Pro, Name = "Pro",
                PriceMonthly = 12m, PriceYearly = 120m,
                MaxDocuments = 50, MaxStorageBytes = 10L * 1024 * 1024 * 1024, MaxChunks = 100_000,
                MaxQuestionsPerMonth = 5_000, MaxKnowledgeBases = 10, TeamWorkspaceEnabled = false,
            },
            new Plan
            {
                Code = PlanId.Team, Name = "Team",
                PriceMonthly = 29m, PriceYearly = 290m,
                MaxDocuments = 200, MaxStorageBytes = 50L * 1024 * 1024 * 1024, MaxChunks = 500_000,
                MaxQuestionsPerMonth = 25_000, MaxKnowledgeBases = 50, TeamWorkspaceEnabled = true,
            },
        };

        var existing = await db.Plans.ToDictionaryAsync(p => p.Code, ct);
        foreach (var plan in wanted)
        {
            if (existing.TryGetValue(plan.Code, out var current))
            {
                current.Name = plan.Name;
                current.PriceMonthly = plan.PriceMonthly;
                current.PriceYearly = plan.PriceYearly;
                current.MaxDocuments = plan.MaxDocuments;
                current.MaxStorageBytes = plan.MaxStorageBytes;
                current.MaxChunks = plan.MaxChunks;
                current.MaxQuestionsPerMonth = plan.MaxQuestionsPerMonth;
                current.MaxKnowledgeBases = plan.MaxKnowledgeBases;
                current.TeamWorkspaceEnabled = plan.TeamWorkspaceEnabled;
            }
            else
            {
                db.Plans.Add(plan);
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
