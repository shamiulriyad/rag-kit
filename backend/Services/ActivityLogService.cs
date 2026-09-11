using System.Text.Json;
using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public record ActivityLogResponse(Guid Id, string Action, string EntityType, string? EntityId, string? Metadata, DateTimeOffset CreatedAt);

public interface IActivityLogService
{
    Task LogAsync(Guid userId, Guid? workspaceId, string action, string entityType,
        string? entityId = null, object? metadata = null, CancellationToken ct = default);

    Task<List<ActivityLogResponse>> ListAsync(Guid userId, int limit, CancellationToken ct);
    Task ClearAsync(Guid userId, CancellationToken ct);
}

/// <summary>Appends to the audit trail (spec section 19). Fire-and-continue: a logging
/// failure never blocks the action it's describing.</summary>
public class ActivityLogService : IActivityLogService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ActivityLogService> _log;

    public ActivityLogService(AppDbContext db, ILogger<ActivityLogService> log)
    {
        _db = db;
        _log = log;
    }

    public async Task LogAsync(Guid userId, Guid? workspaceId, string action, string entityType,
        string? entityId = null, object? metadata = null, CancellationToken ct = default)
    {
        try
        {
            _db.ActivityLogs.Add(new ActivityLog
            {
                UserId = userId,
                WorkspaceId = workspaceId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                MetadataJson = metadata is null ? null : JsonSerializer.Serialize(metadata),
            });
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Failed to write activity log entry for {Action}", action);
        }
    }

    public Task<List<ActivityLogResponse>> ListAsync(Guid userId, int limit, CancellationToken ct) =>
        _db.ActivityLogs.Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new ActivityLogResponse(a.Id, a.Action, a.EntityType, a.EntityId, a.MetadataJson, a.CreatedAt))
            .ToListAsync(ct);

    public async Task ClearAsync(Guid userId, CancellationToken ct)
    {
        await _db.ActivityLogs.Where(a => a.UserId == userId).ExecuteDeleteAsync(ct);
    }
}
