using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Billing;

public record PlanLimitsResponse(int Documents, long StorageBytes, int Chunks, int QuestionsPerMonth, int KnowledgeBases);

/// <summary>Shaped to match frontend/src/lib/plan.ts's <c>Plan</c> interface.</summary>
public record PlanResponse(string Code, string Name, decimal PriceMonthly, decimal PriceYearly, bool TeamWorkspaceEnabled, PlanLimitsResponse Limits);

public record SubscriptionResponse(string PlanCode, string Status, bool IsMock, DateTimeOffset StartedAt, DateTimeOffset? CurrentPeriodEnd);

public record UsageResponse(
    string PlanCode,
    int Documents, int MaxDocuments,
    long StorageBytes, long MaxStorageBytes,
    int Chunks, int MaxChunks,
    int QuestionsThisMonth, int MaxQuestionsPerMonth,
    int KnowledgeBases, int MaxKnowledgeBases);

/// <summary>Dev-only mock activation (spec section 5) - no payment provider is involved.
/// Real Stripe/checkout integration replaces this endpoint later without touching the
/// Subscription/Plan schema.</summary>
public record MockActivateRequest([Required] string PlanCode);
