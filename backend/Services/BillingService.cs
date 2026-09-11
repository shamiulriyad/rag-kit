using Backend.Data;
using Backend.DTOs.Billing;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IBillingService
{
    Task<List<PlanResponse>> GetPlansAsync(CancellationToken ct);
    Task<SubscriptionResponse> GetSubscriptionAsync(Guid userId, CancellationToken ct);
    Task<UsageResponse> GetUsageAsync(Guid userId, CancellationToken ct);
    Task<SubscriptionResponse> MockActivateAsync(Guid userId, MockActivateRequest request, CancellationToken ct);
}

/// <summary>Billing/plan logic, kept deliberately separate from the rest of the app (spec:
/// "clearly separate billing logic"). Payment processing is not implemented - <see cref="MockActivateAsync"/>
/// is a development-only stand-in a real Stripe/checkout flow replaces later.</summary>
public class BillingService : IBillingService
{
    private readonly AppDbContext _db;
    private readonly IPlanLimitService _limits;
    private readonly IActivityLogService _activity;
    private readonly INotificationService _notifications;

    public BillingService(AppDbContext db, IPlanLimitService limits, IActivityLogService activity, INotificationService notifications)
    {
        _db = db;
        _limits = limits;
        _activity = activity;
        _notifications = notifications;
    }

    public async Task<List<PlanResponse>> GetPlansAsync(CancellationToken ct) =>
        await _db.Plans.OrderBy(p => p.PriceMonthly).Select(p => new PlanResponse(
            p.Code.ToString(), p.Name, p.PriceMonthly, p.PriceYearly, p.TeamWorkspaceEnabled,
            new PlanLimitsResponse(p.MaxDocuments, p.MaxStorageBytes, p.MaxChunks, p.MaxQuestionsPerMonth, p.MaxKnowledgeBases)))
            .ToListAsync(ct);

    public async Task<SubscriptionResponse> GetSubscriptionAsync(Guid userId, CancellationToken ct)
    {
        var sub = await _db.Subscriptions.Include(s => s.Plan)
            .Where(s => s.UserId == userId).OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("No subscription found.");
        return new SubscriptionResponse(sub.Plan?.Code.ToString() ?? "Free", sub.Status, sub.IsMock, sub.StartedAt, sub.CurrentPeriodEnd);
    }

    public async Task<UsageResponse> GetUsageAsync(Guid userId, CancellationToken ct)
    {
        var u = await _limits.GetUsageSummaryAsync(userId, ct);
        return new UsageResponse(
            u.PlanCode, u.Documents, u.MaxDocuments, u.StorageBytes, u.MaxStorageBytes,
            u.Chunks, u.MaxChunks, u.QuestionsThisMonth, u.MaxQuestionsPerMonth, u.KnowledgeBases, u.MaxKnowledgeBases);
    }

    public async Task<SubscriptionResponse> MockActivateAsync(Guid userId, MockActivateRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<PlanId>(request.PlanCode, true, out var code))
            throw new ValidationAppException("Unknown plan code. Use Free, Pro, or Team.");

        var plan = await _db.Plans.FirstOrDefaultAsync(p => p.Code == code, ct)
            ?? throw new NotFoundException("Plan not found.");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");

        user.PlanId = plan.Id;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        var sub = await _db.Subscriptions.Where(s => s.UserId == userId).OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync(ct);
        if (sub is null)
        {
            sub = new Subscription { UserId = userId };
            _db.Subscriptions.Add(sub);
        }
        sub.PlanId = plan.Id;
        sub.Status = "active";
        sub.IsMock = true;
        sub.StartedAt = DateTimeOffset.UtcNow;
        sub.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _notifications.PushAsync(userId, NotificationType.PlanReminder, "Plan updated", $"You are now on the {plan.Name} plan (dev mock activation).", ct);

        return new SubscriptionResponse(plan.Code.ToString(), sub.Status, sub.IsMock, sub.StartedAt, sub.CurrentPeriodEnd);
    }
}
