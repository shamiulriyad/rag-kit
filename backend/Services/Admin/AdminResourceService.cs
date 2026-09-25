using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Common;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminResourceService
{
    Task<PagedResult<AdminWorkspaceItem>> ListWorkspacesAsync(string? search, int page, int pageSize, CancellationToken ct);
    Task<AdminWorkspaceDetail> GetWorkspaceAsync(Guid id, CancellationToken ct);
    Task<PagedResult<AdminKnowledgeBaseItem>> ListKnowledgeBasesAsync(string? search, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<AdminDocumentItem>> ListDocumentsAsync(string? search, string? status, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<AdminInvitationItem>> ListInvitationsAsync(string? status, int page, int pageSize, CancellationToken ct);
    Task<List<AdminSearchHit>> SearchAsync(string query, CancellationToken ct);
}

/// <summary>Read-only cross-tenant listings. Sizes/counts are computed from documents, not
/// from the KnowledgeBase counters, which only count successfully processed files.</summary>
public class AdminResourceService : IAdminResourceService
{
    private readonly AppDbContext _db;

    public AdminResourceService(AppDbContext db) => _db = db;

    private static (int page, int size) Clamp(int page, int size) => (Math.Max(page, 1), Math.Clamp(size, 1, 100));

    private IQueryable<AdminWorkspaceItem> WorkspaceQuery(IQueryable<Workspace> q) =>
        q.OrderByDescending(w => w.CreatedAt).Select(w => new AdminWorkspaceItem(
            w.Id, w.Name, w.OwnerId, w.Owner != null ? w.Owner.Email : "", w.Members.Count + 1,
            _db.KnowledgeBases.Count(k => k.WorkspaceId == w.Id),
            _db.Documents.Count(d => d.KnowledgeBase!.WorkspaceId == w.Id),
            _db.Documents.Where(d => d.KnowledgeBase!.WorkspaceId == w.Id).Sum(d => (long?)d.FileSize) ?? 0,
            w.CreatedAt));

    public async Task<PagedResult<AdminWorkspaceItem>> ListWorkspacesAsync(string? search, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = Clamp(page, pageSize);
        var q = _db.Workspaces.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(w => w.Name.ToLower().Contains(s) || (w.Owner != null && w.Owner.Email.ToLower().Contains(s)));
        }
        var total = await q.CountAsync(ct);
        var items = await WorkspaceQuery(q).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<AdminWorkspaceItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<AdminWorkspaceDetail> GetWorkspaceAsync(Guid id, CancellationToken ct)
    {
        var ws = await WorkspaceQuery(_db.Workspaces.Where(w => w.Id == id)).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Workspace not found.");
        var members = await _db.WorkspaceMembers.Where(m => m.WorkspaceId == id)
            .Select(m => new AdminWorkspaceMember(
                m.User != null ? m.User.Email : m.InviteEmail, m.Role.ToString(), m.Status))
            .ToListAsync(ct);
        var kbs = await _db.KnowledgeBases.Where(k => k.WorkspaceId == id).OrderByDescending(k => k.CreatedAt)
            .Select(k => new AdminKnowledgeBaseItem(k.Id, k.Name, k.Owner != null ? k.Owner.Email : "", ws.Name,
                k.DocumentCount, k.ChunkCount, k.CreatedAt))
            .ToListAsync(ct);
        return new AdminWorkspaceDetail(ws, members, kbs);
    }

    public async Task<PagedResult<AdminKnowledgeBaseItem>> ListKnowledgeBasesAsync(string? search, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = Clamp(page, pageSize);
        var q = _db.KnowledgeBases.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(k => k.Name.ToLower().Contains(s) || (k.Owner != null && k.Owner.Email.ToLower().Contains(s)));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(k => k.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(k => new AdminKnowledgeBaseItem(k.Id, k.Name, k.Owner != null ? k.Owner.Email : "",
                k.Workspace != null ? k.Workspace.Name : null, k.DocumentCount, k.ChunkCount, k.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminKnowledgeBaseItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<PagedResult<AdminDocumentItem>> ListDocumentsAsync(string? search, string? status, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = Clamp(page, pageSize);
        var q = _db.Documents.AsQueryable();
        if (Enum.TryParse<DocumentStatus>(status, true, out var st)) q = q.Where(d => d.Status == st);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(d => d.FileName.ToLower().Contains(s)
                || (d.UploadedByUser != null && d.UploadedByUser.Email.ToLower().Contains(s)));
        }
        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(d => d.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(d => new
            {
                d.Id, d.FileName, Kb = d.KnowledgeBase != null ? d.KnowledgeBase.Name : "",
                Owner = d.UploadedByUser != null ? d.UploadedByUser.Email : "", d.Status, d.FileSize,
                d.ChunkCount, d.ErrorMessage, d.CreatedAt,
            })
            .ToListAsync(ct);
        return new PagedResult<AdminDocumentItem>
        {
            Total = total, Page = page, PageSize = pageSize,
            Items = rows.Select(d => new AdminDocumentItem(
                d.Id, d.FileName, d.Kb, d.Owner, d.Status.ToString(), d.FileSize, d.ChunkCount,
                AdminText.Sanitize(d.ErrorMessage), d.CreatedAt)).ToList(),
        };
    }

    public async Task<PagedResult<AdminInvitationItem>> ListInvitationsAsync(string? status, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = Clamp(page, pageSize);
        var q = _db.WorkspaceMembers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(m => m.Status == status);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(m => m.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(m => new AdminInvitationItem(m.Id, m.Workspace != null ? m.Workspace.Name : "", m.InviteEmail,
                m.Role.ToString(), m.Status, m.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminInvitationItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<List<AdminSearchHit>> SearchAsync(string query, CancellationToken ct)
    {
        var s = (query ?? "").Trim().ToLower();
        if (s.Length < 2) return [];

        var users = await _db.Users.Where(u => u.Email.ToLower().Contains(s) || u.FullName.ToLower().Contains(s))
            .Take(5).Select(u => new AdminSearchHit("user", u.Id, u.FullName, u.Email)).ToListAsync(ct);
        var workspaces = await _db.Workspaces.Where(w => w.Name.ToLower().Contains(s))
            .Take(5).Select(w => new AdminSearchHit("workspace", w.Id, w.Name, w.Owner != null ? w.Owner.Email : null)).ToListAsync(ct);
        var docs = await _db.Documents.Where(d => d.FileName.ToLower().Contains(s))
            .Take(5).Select(d => new AdminSearchHit("document", d.Id, d.FileName, d.Status.ToString())).ToListAsync(ct);
        return [.. users, .. workspaces, .. docs];
    }
}
