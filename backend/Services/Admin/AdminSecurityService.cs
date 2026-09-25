using Backend.Authentication;
using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Common;
using Backend.Helpers;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminSecurityService
{
    Task<PagedResult<AdminSecurityEventItem>> ListEventsAsync(bool rateLimits, string? search, string? type, int page, int pageSize, CancellationToken ct);
    Task<List<AdminAdminUserItem>> ListAdminsAsync(CancellationToken ct);
    List<AdminRoleItem> ListRoles();
    Task<PagedResult<AdminApiKeyItem>> ListApiKeysAsync(string? search, string? status, int page, int pageSize, CancellationToken ct);
    Task RevokeApiKeyAsync(Guid id, CancellationToken ct);
}

/// <summary>Read-mostly security views. API keys are shown by prefix only - the full key was never
/// stored, only its hash, and the hash is never returned either.</summary>
public class AdminSecurityService : IAdminSecurityService
{
    private readonly AppDbContext _db;
    private readonly AdminAccess _admins;
    private readonly IAdminAuditService _audit;

    public AdminSecurityService(AppDbContext db, AdminAccess admins, IAdminAuditService audit)
    {
        _db = db;
        _admins = admins;
        _audit = audit;
    }

    public async Task<PagedResult<AdminSecurityEventItem>> ListEventsAsync(
        bool rateLimits, string? search, string? type, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.SecurityEvents.Where(e => rateLimits ? e.Type == "rate_limited" : e.Type != "rate_limited");
        if (!rateLimits && !string.IsNullOrWhiteSpace(type)) q = q.Where(e => e.Type == type);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(e => (e.Email != null && e.Email.ToLower().Contains(s)) || (e.IpAddress != null && e.IpAddress.Contains(s))
                || (e.Path != null && e.Path.ToLower().Contains(s)));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(e => e.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(e => new AdminSecurityEventItem(e.Id, e.CreatedAt, e.Type, e.Email, e.IpAddress, e.Path, e.Details))
            .ToListAsync(ct);
        return new PagedResult<AdminSecurityEventItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<List<AdminAdminUserItem>> ListAdminsAsync(CancellationToken ct)
    {
        var users = await _db.Users.Select(u => new { u.Id, u.Email, u.FullName, u.IsSuspended, u.LastLoginAt }).ToListAsync(ct);
        return users.Where(u => _admins.IsAdmin(u.Email))
            .Select(u => new AdminAdminUserItem(u.Id, u.Email, u.FullName, "Platform admin", u.IsSuspended ? "suspended" : "active", u.LastLoginAt))
            .OrderBy(u => u.Email).ToList();
    }

    public List<AdminRoleItem> ListRoles() =>
        [new AdminRoleItem("Platform admin", "Full access to every admin module. Granted by the Admin:Emails setting.", [.. AdminPermissions.All])];

    public async Task<PagedResult<AdminApiKeyItem>> ListApiKeysAsync(string? search, string? status, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var now = DateTimeOffset.UtcNow;
        var q = _db.ApiKeys.AsQueryable();
        if (status == "revoked") q = q.Where(k => k.RevokedAt != null);
        else if (status == "active") q = q.Where(k => k.RevokedAt == null && (k.ExpiresAt == null || k.ExpiresAt > now));
        else if (status == "expired") q = q.Where(k => k.RevokedAt == null && k.ExpiresAt != null && k.ExpiresAt <= now);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(k => k.Name.ToLower().Contains(s) || k.Prefix.ToLower().Contains(s) || (k.User != null && k.User.Email.ToLower().Contains(s)));
        }
        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(k => k.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(k => new { k.Id, k.Name, k.Prefix, Owner = k.User != null ? k.User.Email : "", k.LastUsedAt, k.ExpiresAt, k.CreatedAt, k.RevokedAt })
            .ToListAsync(ct);
        var items = rows.Select(k => new AdminApiKeyItem(
            k.Id, k.Name, k.Prefix, k.Owner, k.LastUsedAt, k.ExpiresAt, k.CreatedAt,
            k.RevokedAt != null ? "revoked" : k.ExpiresAt != null && k.ExpiresAt <= now ? "expired" : "active")).ToList();
        return new PagedResult<AdminApiKeyItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task RevokeApiKeyAsync(Guid id, CancellationToken ct)
    {
        var key = await _db.ApiKeys.Include(k => k.User).FirstOrDefaultAsync(k => k.Id == id, ct)
            ?? throw new NotFoundException("API key not found.");
        if (key.RevokedAt is null)
        {
            key.RevokedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        await _audit.LogAsync("apikey.revoke", "api_key", id.ToString(), details: $"{key.Prefix} owned by {key.User?.Email}", ct: ct);
    }
}
