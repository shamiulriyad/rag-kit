using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Analytics;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminDashboardService
{
    Task<AdminDashboardResponse> GetAsync(int days, CancellationToken ct);
    Task<AdminTimeSeries> GetTimeSeriesAsync(int days, CancellationToken ct);
}

/// <summary>Platform-wide aggregates, all computed from the live tables - nothing is cached or
/// invented. Revenue is an estimate (paid users x plan price) because no payment provider is
/// connected. "AI usage" is questions answered: token counts are not recorded anywhere.</summary>
public class AdminDashboardService : IAdminDashboardService
{
    private readonly AppDbContext _db;

    public AdminDashboardService(AppDbContext db) => _db = db;

    public async Task<AdminDashboardResponse> GetAsync(int days, CancellationToken ct)
    {
        days = Math.Clamp(days, 1, 365);
        var since = DateTimeOffset.UtcNow.AddDays(-days);

        var totalUsers = await _db.Users.CountAsync(ct);
        var newUsers = await _db.Users.CountAsync(u => u.CreatedAt >= since, ct);
        var active = await _db.Users.CountAsync(u => u.LastLoginAt >= since, ct);
        var suspended = await _db.Users.CountAsync(u => u.IsSuspended, ct);

        var workspaces = await _db.Workspaces.CountAsync(ct);
        var kbs = await _db.KnowledgeBases.CountAsync(ct);
        var docs = await _db.Documents.CountAsync(ct);
        var chunks = await _db.Documents.SumAsync(d => (int?)d.ChunkCount, ct) ?? 0;
        var storage = await _db.Documents.SumAsync(d => (long?)d.FileSize, ct) ?? 0;

        var questions = await _db.ActivityLogs.CountAsync(a => a.Action == ActivityAction.QuestionAsked && a.CreatedAt >= since, ct);
        var totalQuestions = await _db.ActivityLogs.CountAsync(a => a.Action == ActivityAction.QuestionAsked, ct);

        var failedJobs = await _db.DocumentProcessingJobs.CountAsync(j => j.Status == DocumentStatus.Failed && j.UpdatedAt >= since, ct);
        var pending = await _db.DocumentProcessingJobs
            .CountAsync(j => j.Status == DocumentStatus.Queued || j.Status == DocumentStatus.Processing, ct);

        var plans = await _db.Plans.OrderBy(p => p.PriceMonthly).ToListAsync(ct);
        var perPlan = await _db.Users.Where(u => u.PlanId != null)
            .GroupBy(u => u.PlanId!.Value).Select(g => new { PlanId = g.Key, Count = g.Count() }).ToListAsync(ct);
        var withoutPlan = totalUsers - perPlan.Sum(x => x.Count); // accounts with no plan row count as Free
        var planCounts = plans.Select(p =>
        {
            var n = perPlan.FirstOrDefault(x => x.PlanId == p.Id)?.Count ?? 0;
            if (p.Code == Models.PlanId.Free) n += withoutPlan;
            return new PlanCount(p.Name, n, p.PriceMonthly);
        }).ToList();

        var statuses = await _db.Documents.GroupBy(d => d.Status)
            .Select(g => new StatusCount(g.Key.ToString(), g.Count())).ToListAsync(ct);

        return new AdminDashboardResponse(
            days, totalUsers, newUsers, active, suspended, workspaces, kbs, docs, chunks, storage,
            questions, totalQuestions, failedJobs, pending,
            planCounts.Where(p => p.MonthlyPrice > 0).Sum(p => p.Users),
            planCounts.Sum(p => p.Users * p.MonthlyPrice),
            planCounts, statuses);
    }

    public async Task<AdminTimeSeries> GetTimeSeriesAsync(int days, CancellationToken ct)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-Math.Clamp(days, 1, 365));

        var signups = await _db.Users.Where(u => u.CreatedAt >= since).Select(u => u.CreatedAt).ToListAsync(ct);
        var questions = await _db.ActivityLogs
            .Where(a => a.Action == ActivityAction.QuestionAsked && a.CreatedAt >= since)
            .Select(a => a.CreatedAt).ToListAsync(ct);
        var completed = await _db.DocumentProcessingJobs
            .Where(j => j.Status == DocumentStatus.Completed && j.CompletedAt >= since)
            .Select(j => j.CompletedAt!.Value).ToListAsync(ct);
        var failed = await _db.DocumentProcessingJobs
            .Where(j => j.Status == DocumentStatus.Failed && j.UpdatedAt >= since)
            .Select(j => j.UpdatedAt).ToListAsync(ct);

        return new AdminTimeSeries(GroupByDay(signups), GroupByDay(questions), GroupByDay(completed), GroupByDay(failed));
    }

    private static List<TimeSeriesPoint> GroupByDay(List<DateTimeOffset> timestamps) =>
        timestamps.GroupBy(c => DateOnly.FromDateTime(c.UtcDateTime))
            .OrderBy(g => g.Key)
            .Select(g => new TimeSeriesPoint(g.Key, g.Count()))
            .ToList();
}
