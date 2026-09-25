using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public record PlatformStatus(bool MaintenanceMode, string MaintenanceMessage, bool SignupsEnabled);

public interface IPlatformSettingsService
{
    /// <summary>Current switches, cached for a few seconds so the maintenance check on every request
    /// does not hit the database each time.</summary>
    Task<PlatformStatus> GetStatusAsync(CancellationToken ct = default);
    Task<PlatformSettings> GetAsync(CancellationToken ct = default);
    Task<PlatformSettings> UpdateAsync(bool maintenance, string? message, bool signups, string updatedBy, CancellationToken ct = default);
}

public class PlatformSettingsService : IPlatformSettingsService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(5);
    private static PlatformStatus? _cached;
    private static DateTimeOffset _cachedAt;

    private readonly AppDbContext _db;

    public PlatformSettingsService(AppDbContext db) => _db = db;

    public async Task<PlatformStatus> GetStatusAsync(CancellationToken ct = default)
    {
        if (_cached is not null && DateTimeOffset.UtcNow - _cachedAt < Ttl) return _cached;
        var s = await GetAsync(ct);
        _cached = new PlatformStatus(s.MaintenanceMode, s.MaintenanceMessage, s.SignupsEnabled);
        _cachedAt = DateTimeOffset.UtcNow;
        return _cached;
    }

    public async Task<PlatformSettings> GetAsync(CancellationToken ct = default)
    {
        var row = await _db.PlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct);
        return row ?? new PlatformSettings();
    }

    public async Task<PlatformSettings> UpdateAsync(bool maintenance, string? message, bool signups, string updatedBy, CancellationToken ct = default)
    {
        var row = await _db.PlatformSettings.FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (row is null)
        {
            row = new PlatformSettings();
            _db.PlatformSettings.Add(row);
        }
        row.MaintenanceMode = maintenance;
        row.MaintenanceMessage = (message ?? "").Trim();
        row.SignupsEnabled = signups;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        row.UpdatedByEmail = updatedBy;
        await _db.SaveChangesAsync(ct);
        _cached = null; // the change takes effect on the very next request
        return row;
    }
}
