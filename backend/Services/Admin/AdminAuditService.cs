using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Common;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminAuditService
{
    Task LogAsync(string action, string resourceType, string? resourceId, string result = "success",
        string? details = null, CancellationToken ct = default);

    Task<PagedResult<AdminAuditItem>> ListAsync(string? search, string? result, int page, int pageSize, CancellationToken ct);
}

/// <summary>Append-only record of what admins did. The actor always comes from the JWT
/// (ICurrentUserService), never from a request body.</summary>
public class AdminAuditService : IAdminAuditService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _current;
    private readonly IHttpContextAccessor _http;

    public AdminAuditService(AppDbContext db, ICurrentUserService current, IHttpContextAccessor http)
    {
        _db = db;
        _current = current;
        _http = http;
    }

    public async Task LogAsync(string action, string resourceType, string? resourceId, string result = "success",
        string? details = null, CancellationToken ct = default)
    {
        _db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorId = _current.UserId,
            ActorEmail = _current.Email,
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Result = result,
            Details = AdminText.Sanitize(details, 500),
            IpAddress = _http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<AdminAuditItem>> ListAsync(string? search, string? result, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.AdminAuditLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(result)) q = q.Where(a => a.Result == result);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(a => a.ActorEmail.ToLower().Contains(s) || a.Action.ToLower().Contains(s)
                || a.ResourceType.ToLower().Contains(s) || (a.Details != null && a.Details.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(a => a.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new AdminAuditItem(a.Id, a.CreatedAt, a.ActorEmail, a.Action, a.ResourceType, a.ResourceId, a.Result, a.Details))
            .ToListAsync(ct);
        return new PagedResult<AdminAuditItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }
}

/// <summary>Anything an admin can read that originated from user input, a worker, or an
/// exception passes through here first: no stack frames, no file paths, no secrets.</summary>
public static class AdminText
{
    private static readonly Regex Path = new(@"([A-Za-z]:\\|/)[\w\-. \\/]{6,}", RegexOptions.Compiled);
    private static readonly Regex Secret = new(@"(?i)(api[_-]?key|token|secret|password|bearer)\s*[=:]?\s*[\w\-\.=/+]{6,}", RegexOptions.Compiled);

    public static string? Sanitize(string? text, int max = 400)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var lines = text.Split('\n').Where(l => !l.TrimStart().StartsWith("at ", StringComparison.Ordinal));
        var clean = string.Join(' ', lines).Trim();
        clean = Secret.Replace(clean, "$1=[redacted]");
        clean = Path.Replace(clean, "[path]");
        return clean.Length <= max ? clean : clean[..max] + "…";
    }
}
