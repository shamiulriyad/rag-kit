using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Common;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminUsageService
{
    Task<AdminUsageResponse> GetAsync(int months, CancellationToken ct);
    Task<PagedResult<AdminBillingEventItem>> ListBillingEventsAsync(int page, int pageSize, CancellationToken ct);
}

/// <summary>Platform usage from the monthly UsageRecord rows, plus cost figures that are clearly
/// estimates: token counts are not recorded and no payment provider is connected, so nothing
/// here is verified billing. The per-question AI rate comes from config
/// (<c>Admin:EstimatedCostPerQuestionUsd</c>) and is null until an operator sets it.</summary>
public class AdminUsageService : IAdminUsageService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AdminUsageService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AdminUsageResponse> GetAsync(int months, CancellationToken ct)
    {
        months = Math.Clamp(months, 1, 24);
        var today = DateTime.UtcNow;
        var current = new DateOnly(today.Year, today.Month, 1);
        var from = current.AddMonths(-(months - 1));

        var rows = await _db.UsageRecords.Where(u => u.Month >= from)
            .GroupBy(u => u.Month)
            .Select(g => new
            {
                Month = g.Key,
                Questions = g.Sum(x => x.QuestionsUsed),
                Documents = g.Sum(x => x.DocumentsUsed),
                Storage = g.Sum(x => x.StorageUsedBytes),
                Chunks = g.Sum(x => x.ChunksUsed),
                Users = g.Count(x => x.QuestionsUsed > 0 || x.DocumentsUsed > 0),
            })
            .ToListAsync(ct);

        var monthly = Enumerable.Range(0, months).Select(i => from.AddMonths(i)).Select(m =>
        {
            var r = rows.FirstOrDefault(x => x.Month == m);
            return new AdminUsageMonth(m.ToString("yyyy-MM"), r?.Questions ?? 0, r?.Documents ?? 0, r?.Storage ?? 0, r?.Chunks ?? 0, r?.Users ?? 0);
        }).ToList();

        var top = await _db.UsageRecords.Where(u => u.Month == current)
            .OrderByDescending(u => u.QuestionsUsed).ThenByDescending(u => u.StorageUsedBytes).Take(10)
            .Select(u => new AdminTopUsage(
                u.User != null ? u.User.Email : "", u.User != null && u.User.Plan != null ? u.User.Plan.Name : "Free",
                u.QuestionsUsed, u.DocumentsUsed, u.StorageUsedBytes))
            .ToListAsync(ct);

        decimal? rate = decimal.TryParse(_config["Admin:EstimatedCostPerQuestionUsd"],
            System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var r2) && r2 >= 0 ? r2 : null;
        var questionsThisMonth = monthly[^1].Questions;

        var paid = await _db.Users.Where(u => u.Plan != null && u.Plan.PriceMonthly > 0)
            .Select(u => u.Plan!.PriceMonthly).ToListAsync(ct);

        var estimate = new AdminCostEstimate(
            rate,
            rate.HasValue ? Math.Round(rate.Value * questionsThisMonth, 2) : null,
            paid.Count, paid.Sum());

        return new AdminUsageResponse(monthly, top, estimate);
    }

    public async Task<PagedResult<AdminBillingEventItem>> ListBillingEventsAsync(int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await _db.Subscriptions.CountAsync(ct);
        var rows = await _db.Subscriptions.OrderByDescending(s => s.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new
            {
                s.Id, s.UpdatedAt, s.StartedAt, s.Status, s.IsMock,
                Email = s.User != null ? s.User.Email : "", Plan = s.Plan != null ? s.Plan.Name : "",
                Price = s.Plan != null ? s.Plan.PriceMonthly : 0m,
            })
            .ToListAsync(ct);

        // One row per subscription, worded by its current state. There is no payment provider, so
        // no charge, invoice or refund events exist to list.
        var items = rows.Select(r => new AdminBillingEventItem(
            r.Id, r.Status == SubscriptionStatus.Active || r.Status == SubscriptionStatus.Trial ? r.StartedAt : r.UpdatedAt,
            r.Status switch
            {
                SubscriptionStatus.Canceled => "subscription.canceled",
                SubscriptionStatus.Expired => "subscription.expired",
                SubscriptionStatus.PastDue => "subscription.past_due",
                SubscriptionStatus.Trial => "subscription.trial",
                _ => "subscription.started",
            },
            r.Email, r.Plan, r.Price, r.IsMock ? "simulated" : "provider")).ToList();
        return new PagedResult<AdminBillingEventItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }
}
