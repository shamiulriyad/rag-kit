using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Common;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminCmsService
{
    Task<PagedResult<AdminCmsItem>> ListAsync(string? type, string? status, string? search, int page, int pageSize, CancellationToken ct);
    Task<AdminCmsDetail> GetAsync(Guid id, CancellationToken ct);
    Task<AdminCmsDetail> CreateAsync(AdminCmsSaveRequest request, CancellationToken ct);
    Task<AdminCmsDetail> UpdateAsync(Guid id, AdminCmsSaveRequest request, CancellationToken ct);
    Task SetPublishedAsync(Guid id, bool published, CancellationToken ct);
    Task<AdminCmsDetail> RestoreAsync(Guid id, int version, CancellationToken ct);
}

/// <summary>Website content. Text only: markup is rejected on save, so nothing an admin stores
/// can inject script into the public site. Every change writes a version and an audit entry.</summary>
public partial class AdminCmsService : IAdminCmsService
{
    public static readonly string[] Types =
        ["homepage", "feature", "usecase", "faq", "blog", "docs", "announcement", "pricing"];

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _current;
    private readonly IAdminAuditService _audit;

    public AdminCmsService(AppDbContext db, ICurrentUserService current, IAdminAuditService audit)
    {
        _db = db;
        _current = current;
        _audit = audit;
    }

    [GeneratedRegex(@"<\s*/?\s*[a-zA-Z!][^>]*>|javascript\s*:|data\s*:\s*text/html|\bon\w+\s*=", RegexOptions.IgnoreCase)]
    private static partial Regex Markup();

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NonSlug();

    private static string Clean(string? value, string field)
    {
        var v = (value ?? "").Trim();
        if (Markup().IsMatch(v))
            throw new ValidationAppException($"{field} cannot contain HTML, scripts or event handlers. Use plain text.");
        return v;
    }

    private static string SlugFor(string? slug, string title)
    {
        var s = NonSlug().Replace((string.IsNullOrWhiteSpace(slug) ? title : slug).ToLowerInvariant(), "-").Trim('-');
        if (s.Length == 0) throw new ValidationAppException("Slug must contain letters or numbers.");
        return s.Length > 120 ? s[..120].Trim('-') : s;
    }

    private static AdminCmsItem ToItem(CmsContent c) => new(
        c.Id, c.Type, c.Slug, c.Title, c.Status, c.Version, c.AuthorEmail, c.UpdatedByEmail, c.UpdatedAt, c.PublishedAt);

    public async Task<PagedResult<AdminCmsItem>> ListAsync(string? type, string? status, string? search, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.CmsContents.AsQueryable();
        if (!string.IsNullOrWhiteSpace(type)) q = q.Where(c => c.Type == type);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(c => c.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(c => c.Title.ToLower().Contains(s) || c.Slug.Contains(s) || c.AuthorEmail.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(c => c.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<AdminCmsItem> { Items = rows.Select(ToItem).ToList(), Total = total, Page = page, PageSize = pageSize };
    }

    private async Task<CmsContent> LoadAsync(Guid id, CancellationToken ct) =>
        await _db.CmsContents.Include(c => c.Versions).FirstOrDefaultAsync(c => c.Id == id, ct)
        ?? throw new NotFoundException("Content not found.");

    private static AdminCmsDetail ToDetail(CmsContent c) => new(
        c.Id, c.Type, c.Slug, c.Title, c.Summary, c.Body, c.Status, c.Version, c.AuthorEmail, c.UpdatedByEmail,
        c.CreatedAt, c.UpdatedAt, c.PublishedAt,
        c.Versions.OrderByDescending(v => v.Version).Select(v => new AdminCmsVersionItem(v.Version, v.Title, v.EditedByEmail, v.CreatedAt)).ToList());

    public async Task<AdminCmsDetail> GetAsync(Guid id, CancellationToken ct) => ToDetail(await LoadAsync(id, ct));

    private static CmsContentVersion Snapshot(CmsContent c, string editor) => new()
    {
        ContentId = c.Id, Version = c.Version, Title = c.Title, Summary = c.Summary, Body = c.Body, EditedByEmail = editor,
    };

    public async Task<AdminCmsDetail> CreateAsync(AdminCmsSaveRequest r, CancellationToken ct)
    {
        var type = r.Type.Trim().ToLowerInvariant();
        if (!Types.Contains(type)) throw new ValidationAppException("Unknown content type.");
        var slug = SlugFor(r.Slug, r.Title);
        if (await _db.CmsContents.AnyAsync(c => c.Type == type && c.Slug == slug, ct))
            throw new ConflictException("An item of this type already uses that slug.");

        var c = new CmsContent
        {
            Type = type, Slug = slug, Title = Clean(r.Title, "Title"), Summary = Clean(r.Summary, "Summary"),
            Body = Clean(r.Body, "Body"), AuthorEmail = _current.Email, UpdatedByEmail = _current.Email,
        };
        if (c.Title.Length == 0) throw new ValidationAppException("Title is required.");
        c.Versions.Add(Snapshot(c, _current.Email));
        _db.CmsContents.Add(c);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("cms.create", "cms", c.Id.ToString(), details: $"{type}: {c.Title}", ct: ct);
        return ToDetail(c);
    }

    public async Task<AdminCmsDetail> UpdateAsync(Guid id, AdminCmsSaveRequest r, CancellationToken ct)
    {
        var c = await LoadAsync(id, ct);
        var slug = SlugFor(r.Slug ?? c.Slug, r.Title);
        if (slug != c.Slug && await _db.CmsContents.AnyAsync(x => x.Type == c.Type && x.Slug == slug && x.Id != id, ct))
            throw new ConflictException("An item of this type already uses that slug.");

        c.Title = Clean(r.Title, "Title");
        if (c.Title.Length == 0) throw new ValidationAppException("Title is required.");
        c.Summary = Clean(r.Summary, "Summary");
        c.Body = Clean(r.Body, "Body");
        c.Slug = slug;
        c.Version++;
        c.UpdatedAt = DateTimeOffset.UtcNow;
        c.UpdatedByEmail = _current.Email;
        _db.CmsContentVersions.Add(Snapshot(c, _current.Email));
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("cms.update", "cms", c.Id.ToString(), details: $"v{c.Version}: {c.Title}", ct: ct);
        return ToDetail(await LoadAsync(id, ct));
    }

    public async Task SetPublishedAsync(Guid id, bool published, CancellationToken ct)
    {
        var c = await _db.CmsContents.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Content not found.");
        c.Status = published ? "published" : "draft";
        c.PublishedAt = published ? DateTimeOffset.UtcNow : null;
        c.UpdatedAt = DateTimeOffset.UtcNow;
        c.UpdatedByEmail = _current.Email;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(published ? "cms.publish" : "cms.unpublish", "cms", c.Id.ToString(), details: c.Title, ct: ct);
    }

    public async Task<AdminCmsDetail> RestoreAsync(Guid id, int version, CancellationToken ct)
    {
        var c = await LoadAsync(id, ct);
        var v = c.Versions.FirstOrDefault(x => x.Version == version) ?? throw new NotFoundException("Version not found.");
        c.Title = v.Title;
        c.Summary = v.Summary;
        c.Body = v.Body;
        c.Version++;
        c.UpdatedAt = DateTimeOffset.UtcNow;
        c.UpdatedByEmail = _current.Email;
        _db.CmsContentVersions.Add(Snapshot(c, _current.Email));
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("cms.restore", "cms", c.Id.ToString(), details: $"restored v{version} as v{c.Version}", ct: ct);
        return ToDetail(await LoadAsync(id, ct));
    }
}
