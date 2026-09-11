using Backend.Data;
using Backend.DTOs.Analytics;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IAnalyticsService
{
    Task<AnalyticsOverviewResponse> GetOverviewAsync(Guid userId, CancellationToken ct);
    Task<List<TimeSeriesPoint>> GetQuestionsOverTimeAsync(Guid userId, int days, CancellationToken ct);
    Task<List<TimeSeriesPoint>> GetDocumentsOverTimeAsync(Guid userId, int days, CancellationToken ct);
}

/// <summary>Read-only aggregates over the caller's own Knowledge Bases/documents/activity
/// (spec section 18). Everything here is derived from existing tables - no separate
/// analytics store.</summary>
public class AnalyticsService : IAnalyticsService
{
    private readonly AppDbContext _db;
    private readonly IPlanLimitService _limits;

    public AnalyticsService(AppDbContext db, IPlanLimitService limits)
    {
        _db = db;
        _limits = limits;
    }

    public async Task<AnalyticsOverviewResponse> GetOverviewAsync(Guid userId, CancellationToken ct)
    {
        var usage = await _limits.GetUsageSummaryAsync(userId, ct);

        var top = await _db.KnowledgeBases.Where(k => k.OwnerId == userId)
            .OrderByDescending(k => k.DocumentCount).ThenByDescending(k => k.ChunkCount)
            .Take(5)
            .Select(k => new TopKnowledgeBaseItem(k.Id, k.Name, k.DocumentCount, k.ChunkCount))
            .ToListAsync(ct);

        return new AnalyticsOverviewResponse(
            usage.KnowledgeBases, usage.Documents, usage.Chunks, usage.QuestionsThisMonth, usage.StorageBytes, top);
    }

    public async Task<List<TimeSeriesPoint>> GetQuestionsOverTimeAsync(Guid userId, int days, CancellationToken ct)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-Math.Clamp(days, 1, 365));
        var timestamps = await _db.ActivityLogs
            .Where(a => a.UserId == userId && a.Action == Models.ActivityAction.QuestionAsked && a.CreatedAt >= since)
            .Select(a => a.CreatedAt)
            .ToListAsync(ct);
        return GroupByDay(timestamps);
    }

    public async Task<List<TimeSeriesPoint>> GetDocumentsOverTimeAsync(Guid userId, int days, CancellationToken ct)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-Math.Clamp(days, 1, 365));
        var kbIds = _db.KnowledgeBases.Where(k => k.OwnerId == userId).Select(k => k.Id);
        var timestamps = await _db.Documents
            .Where(d => kbIds.Contains(d.KnowledgeBaseId) && d.CreatedAt >= since)
            .Select(d => d.CreatedAt)
            .ToListAsync(ct);
        return GroupByDay(timestamps);
    }

    private static List<TimeSeriesPoint> GroupByDay(List<DateTimeOffset> timestamps) =>
        timestamps.GroupBy(c => DateOnly.FromDateTime(c.UtcDateTime))
            .OrderBy(g => g.Key)
            .Select(g => new TimeSeriesPoint(g.Key, g.Count()))
            .ToList();
}
