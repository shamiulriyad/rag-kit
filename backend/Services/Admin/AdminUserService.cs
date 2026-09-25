using Backend.Authentication;
using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Billing;
using Backend.DTOs.Common;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminUserService
{
    Task<PagedResult<AdminUserItem>> ListAsync(string? search, string? status, string? plan, int page, int pageSize, CancellationToken ct);
    Task<AdminUserDetail> GetAsync(Guid id, CancellationToken ct);
    Task SuspendAsync(Guid id, string reason, CancellationToken ct);
    Task ReactivateAsync(Guid id, CancellationToken ct);
    Task SetPlanAsync(Guid id, string planCode, CancellationToken ct);
}

public class AdminUserService : IAdminUserService
{
    private readonly AppDbContext _db;
    private readonly AdminAccess _admins;
    private readonly ICurrentUserService _current;
    private readonly IAdminAuditService _audit;
    private readonly IBillingService _billing;

    public AdminUserService(AppDbContext db, AdminAccess admins, ICurrentUserService current,
        IAdminAuditService audit, IBillingService billing)
    {
        _db = db;
        _admins = admins;
        _current = current;
        _audit = audit;
        _billing = billing;
    }

    public async Task<PagedResult<AdminUserItem>> ListAsync(
        string? search, string? status, string? plan, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(u => u.Email.ToLower().Contains(s) || u.FullName.ToLower().Contains(s));
        }
        if (status == "suspended") q = q.Where(u => u.IsSuspended);
        else if (status == "active") q = q.Where(u => !u.IsSuspended);
        if (Enum.TryParse<PlanId>(plan, true, out var code))
            q = code == PlanId.Free
                ? q.Where(u => u.Plan == null || u.Plan.Code == PlanId.Free)
                : q.Where(u => u.Plan != null && u.Plan.Code == code);

        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(u => u.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new
            {
                u.Id, u.Email, u.FullName, Plan = u.Plan != null ? u.Plan.Name : "Free",
                Workspaces = _db.Workspaces.Count(w => w.OwnerId == u.Id || w.Members.Any(m => m.UserId == u.Id)),
                u.IsSuspended, u.CreatedAt, u.LastLoginAt,
            })
            .ToListAsync(ct);

        return new PagedResult<AdminUserItem>
        {
            Total = total, Page = page, PageSize = pageSize,
            Items = rows.Select(r => new AdminUserItem(
                r.Id, r.Email, r.FullName, _admins.IsAdmin(r.Email) ? "Platform admin" : "Customer", r.Plan,
                r.Workspaces, r.IsSuspended ? "suspended" : "active", r.CreatedAt, r.LastLoginAt)).ToList(),
        };
    }

    public async Task<AdminUserDetail> GetAsync(Guid id, CancellationToken ct)
    {
        var u = await _db.Users.Include(x => x.Plan).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("User not found.");

        var workspaces = await _db.Workspaces
            .Where(w => w.OwnerId == id || w.Members.Any(m => m.UserId == id))
            .Select(w => new AdminUserWorkspace(
                w.Id, w.Name, w.OwnerId == id ? "Owner" : w.Members.First(m => m.UserId == id).Role.ToString(),
                w.Members.Count + 1))
            .ToListAsync(ct);

        var kbIds = _db.KnowledgeBases.Where(k => k.OwnerId == id).Select(k => k.Id);
        var monthStart = new DateTimeOffset(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var usage = new AdminUserUsage(
            await kbIds.CountAsync(ct),
            await _db.Documents.CountAsync(d => kbIds.Contains(d.KnowledgeBaseId), ct),
            await _db.Documents.Where(d => kbIds.Contains(d.KnowledgeBaseId)).SumAsync(d => (int?)d.ChunkCount, ct) ?? 0,
            await _db.Documents.Where(d => kbIds.Contains(d.KnowledgeBaseId)).SumAsync(d => (long?)d.FileSize, ct) ?? 0,
            await _db.ActivityLogs.CountAsync(a => a.UserId == id && a.Action == ActivityAction.QuestionAsked, ct),
            await _db.ActivityLogs.CountAsync(a => a.UserId == id && a.Action == ActivityAction.QuestionAsked && a.CreatedAt >= monthStart, ct));

        var activity = await _db.ActivityLogs.Where(a => a.UserId == id)
            .OrderByDescending(a => a.CreatedAt).Take(25)
            .Select(a => new AdminUserActivity(a.Action, a.EntityType, a.CreatedAt)).ToListAsync(ct);

        var now = DateTimeOffset.UtcNow;
        var sessions = await _db.RefreshTokens.CountAsync(t => t.UserId == id && t.RevokedAt == null && t.ExpiresAt > now, ct);

        return new AdminUserDetail(
            u.Id, u.Email, u.FullName, _admins.IsAdmin(u.Email) ? "Platform admin" : "Customer",
            u.Plan?.Name ?? "Free", u.IsSuspended ? "suspended" : "active", u.CreatedAt, u.LastLoginAt,
            workspaces, usage, activity,
            new AdminUserSecurity(sessions, u.LastLoginAt, u.IsSuspended, u.SuspendedAt, u.SuspensionReason));
    }

    public async Task SuspendAsync(Guid id, string reason, CancellationToken ct)
    {
        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("User not found.");

        if (id == _current.UserId || _admins.IsAdmin(u.Email))
        {
            await _audit.LogAsync("user.suspend", "User", id.ToString(), "denied", "Admins cannot be suspended.", ct);
            throw new ForbiddenException("Platform admins cannot be suspended.");
        }
        if (u.IsSuspended) throw new ConflictException("This user is already suspended.");

        u.IsSuspended = true;
        u.SuspendedAt = DateTimeOffset.UtcNow;
        u.SuspensionReason = reason.Trim();
        u.UpdatedAt = DateTimeOffset.UtcNow;

        // Kill every open session so the suspension takes effect at the next token refresh.
        var tokens = await _db.RefreshTokens.Where(t => t.UserId == id && t.RevokedAt == null).ToListAsync(ct);
        foreach (var t in tokens) t.RevokedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("user.suspend", "User", id.ToString(), "success", $"{u.Email}: {reason.Trim()}", ct);
    }

    public async Task ReactivateAsync(Guid id, CancellationToken ct)
    {
        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("User not found.");
        if (!u.IsSuspended) throw new ConflictException("This user is not suspended.");

        u.IsSuspended = false;
        u.SuspendedAt = null;
        u.SuspensionReason = null;
        u.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("user.reactivate", "User", id.ToString(), "success", u.Email, ct);
    }

    public async Task SetPlanAsync(Guid id, string planCode, CancellationToken ct)
    {
        if (!await _db.Users.AnyAsync(u => u.Id == id, ct)) throw new NotFoundException("User not found.");
        await _billing.MockActivateAsync(id, new MockActivateRequest(planCode), ct);
        await _audit.LogAsync("user.plan.change", "User", id.ToString(), "success", $"Plan set to {planCode}", ct);
    }
}
