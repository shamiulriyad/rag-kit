namespace Backend.Models;

/// <summary>An account's subscription record. Payment processing is not implemented
/// (spec section 5) - activation here is a mock toggle so Stripe/checkout can be
/// dropped in later without reshaping this table.</summary>
public class Subscription
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid PlanId { get; set; }
    public Plan? Plan { get; set; }

    /// <summary>"active" | "canceled" | "mock" - never touched by a real payment provider yet.</summary>
    public string Status { get; set; } = "active";

    /// <summary>True when activated via the dev-only mock endpoint rather than a real payment.</summary>
    public bool IsMock { get; set; } = true;

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CurrentPeriodEnd { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
