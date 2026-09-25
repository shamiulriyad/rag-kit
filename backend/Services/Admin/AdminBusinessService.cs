using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Common;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminBusinessService
{
    Task<List<AdminPlanItem>> ListPlansAsync(CancellationToken ct);
    Task<PagedResult<AdminSubscriptionItem>> ListSubscriptionsAsync(int page, int pageSize, CancellationToken ct);
}

/// <summary>Plans and subscriptions as stored. Every subscription today is a mock activation
/// (IsMock) - no payment provider exists - so nothing here counts as verified billing.</summary>
public class AdminBusinessService : IAdminBusinessService
{
    private readonly AppDbContext _db;

    public AdminBusinessService(AppDbContext db) => _db = db;

    public async Task<List<AdminPlanItem>> ListPlansAsync(CancellationToken ct)
    {
        var plans = await _db.Plans.OrderBy(p => p.PriceMonthly).ToListAsync(ct);
        var counts = await _db.Users.Where(u => u.PlanId != null)
            .GroupBy(u => u.PlanId!.Value).Select(g => new { Id = g.Key, N = g.Count() }).ToListAsync(ct);
        var noPlan = await _db.Users.CountAsync(u => u.PlanId == null, ct);

        return plans.Select(p => new AdminPlanItem(
            p.Code.ToString(), p.Name, p.PriceMonthly, p.PriceYearly,
            (counts.FirstOrDefault(c => c.Id == p.Id)?.N ?? 0) + (p.Code == PlanId.Free ? noPlan : 0),
            p.MaxDocuments, p.MaxStorageBytes, p.MaxQuestionsPerMonth, p.MaxKnowledgeBases)).ToList();
    }

    public async Task<PagedResult<AdminSubscriptionItem>> ListSubscriptionsAsync(int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await _db.Subscriptions.CountAsync(ct);
        var items = await _db.Subscriptions.OrderByDescending(s => s.StartedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new AdminSubscriptionItem(
                s.Id, s.User != null ? s.User.Email : "", s.Plan != null ? s.Plan.Name : "", s.Status.ToString(),
                s.IsMock, s.StartedAt, s.CurrentPeriodEnd))
            .ToListAsync(ct);
        return new PagedResult<AdminSubscriptionItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }
}
