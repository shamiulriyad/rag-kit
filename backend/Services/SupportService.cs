using Backend.Data;
using Backend.DTOs.Common;
using Backend.DTOs.Support;
using Backend.Helpers;
using Backend.Models;
using Backend.Services.Admin;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface ISupportService
{
    Task<List<SupportTicketItem>> ListMineAsync(Guid userId, CancellationToken ct);
    Task<SupportTicketDetail> GetMineAsync(Guid userId, Guid id, CancellationToken ct);
    Task<SupportTicketDetail> CreateAsync(Guid userId, string email, CreateTicketRequest request, CancellationToken ct);
    Task<SupportTicketDetail> ReplyMineAsync(Guid userId, string email, Guid id, string body, CancellationToken ct);
    Task CloseMineAsync(Guid userId, Guid id, CancellationToken ct);

    Task<PagedResult<AdminTicketItem>> ListAllAsync(string? status, string? search, Guid? userId, int page, int pageSize, CancellationToken ct);
    Task<AdminTicketDetail> GetAdminAsync(Guid id, CancellationToken ct);
    Task<AdminTicketDetail> StaffReplyAsync(Guid id, string body, CancellationToken ct);
    Task SetStatusAsync(Guid id, string status, CancellationToken ct);
}

/// <summary>Customer side always filters by the JWT user id, so a ticket id alone never grants access
/// to someone else's ticket. Staff side is reached only through the PlatformAdmin-only controller.</summary>
public class SupportService : ISupportService
{
    private static readonly string[] Statuses = ["open", "answered", "closed"];

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _current;
    private readonly IAdminAuditService _audit;

    public SupportService(AppDbContext db, ICurrentUserService current, IAdminAuditService audit)
    {
        _db = db;
        _current = current;
        _audit = audit;
    }

    private static SupportMessageResponse ToMessage(SupportMessage m) => new(m.Id, m.IsStaff ? "Support team" : m.AuthorEmail, m.IsStaff, m.Body, m.CreatedAt);

    private static SupportTicketDetail ToDetail(SupportTicket t) => new(
        t.Id, t.Subject, t.Status, t.CreatedAt, t.UpdatedAt, t.Messages.OrderBy(m => m.CreatedAt).Select(ToMessage).ToList());

    private static string Text(string? v, string field)
    {
        var s = (v ?? "").Trim();
        if (s.Length == 0) throw new ValidationAppException($"{field} is required.");
        return s;
    }

    private async Task<SupportTicket> LoadMineAsync(Guid userId, Guid id, CancellationToken ct) =>
        await _db.SupportTickets.Include(t => t.Messages).FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct)
        ?? throw new NotFoundException("Ticket not found.");

    public async Task<List<SupportTicketItem>> ListMineAsync(Guid userId, CancellationToken ct) =>
        await _db.SupportTickets.Where(t => t.UserId == userId).OrderByDescending(t => t.UpdatedAt)
            .Select(t => new SupportTicketItem(t.Id, t.Subject, t.Status, t.CreatedAt, t.UpdatedAt, t.Messages.Count))
            .ToListAsync(ct);

    public async Task<SupportTicketDetail> GetMineAsync(Guid userId, Guid id, CancellationToken ct) =>
        ToDetail(await LoadMineAsync(userId, id, ct));

    public async Task<SupportTicketDetail> CreateAsync(Guid userId, string email, CreateTicketRequest r, CancellationToken ct)
    {
        var open = await _db.SupportTickets.CountAsync(t => t.UserId == userId && t.Status != "closed", ct);
        if (open >= 10) throw new ValidationAppException("You have too many open tickets. Please wait for a reply or close one.");

        var ticket = new SupportTicket { UserId = userId, Subject = Text(r.Subject, "Subject") };
        ticket.Messages.Add(new SupportMessage { TicketId = ticket.Id, AuthorId = userId, AuthorEmail = email, Body = Text(r.Message, "Message") });
        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync(ct);
        return ToDetail(ticket);
    }

    public async Task<SupportTicketDetail> ReplyMineAsync(Guid userId, string email, Guid id, string body, CancellationToken ct)
    {
        var t = await LoadMineAsync(userId, id, ct);
        var msg = new SupportMessage { TicketId = t.Id, AuthorId = userId, AuthorEmail = email, Body = Text(body, "Message") };
        _db.SupportMessages.Add(msg);
        t.Messages.Add(msg);
        t.Status = "open"; // a customer reply always puts the ticket back in front of staff
        t.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDetail(t);
    }

    public async Task CloseMineAsync(Guid userId, Guid id, CancellationToken ct)
    {
        var t = await _db.SupportTickets.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct)
            ?? throw new NotFoundException("Ticket not found.");
        t.Status = "closed";
        t.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    // ---- staff ----------------------------------------------------------------------------
    public async Task<PagedResult<AdminTicketItem>> ListAllAsync(string? status, string? search, Guid? userId, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.SupportTickets.AsQueryable();
        if (userId.HasValue) q = q.Where(t => t.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(t => t.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(t => t.Subject.ToLower().Contains(s) || (t.User != null && t.User.Email.ToLower().Contains(s)));
        }
        var total = await q.CountAsync(ct);
        // Tickets waiting on staff come first, oldest activity first within them.
        var items = await q.OrderBy(t => t.Status == "open" ? 0 : t.Status == "answered" ? 1 : 2)
            .ThenBy(t => t.Status == "open" ? t.UpdatedAt : DateTimeOffset.MaxValue)
            .ThenByDescending(t => t.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new AdminTicketItem(t.Id, t.Subject, t.Status, t.UserId, t.User != null ? t.User.Email : "", t.Messages.Count, t.CreatedAt, t.UpdatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminTicketItem> { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    private async Task<SupportTicket> LoadAnyAsync(Guid id, CancellationToken ct) =>
        await _db.SupportTickets.Include(t => t.Messages).Include(t => t.User).ThenInclude(u => u!.Plan).FirstOrDefaultAsync(t => t.Id == id, ct)
        ?? throw new NotFoundException("Ticket not found.");

    private static AdminTicketDetail ToAdmin(SupportTicket t) => new(
        t.Id, t.Subject, t.Status, t.UserId, t.User?.Email ?? "", t.User?.Plan?.Name ?? "Free",
        t.CreatedAt, t.UpdatedAt, t.Messages.OrderBy(m => m.CreatedAt).Select(ToMessage).ToList());

    public async Task<AdminTicketDetail> GetAdminAsync(Guid id, CancellationToken ct) => ToAdmin(await LoadAnyAsync(id, ct));

    public async Task<AdminTicketDetail> StaffReplyAsync(Guid id, string body, CancellationToken ct)
    {
        var t = await LoadAnyAsync(id, ct);
        var msg = new SupportMessage { TicketId = t.Id, AuthorId = _current.UserId, AuthorEmail = _current.Email, IsStaff = true, Body = Text(body, "Reply") };
        _db.SupportMessages.Add(msg);
        t.Messages.Add(msg);
        t.Status = "answered";
        t.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("support.reply", "ticket", t.Id.ToString(), details: t.Subject, ct: ct);
        return ToAdmin(t);
    }

    public async Task SetStatusAsync(Guid id, string status, CancellationToken ct)
    {
        status = status.Trim().ToLowerInvariant();
        if (!Statuses.Contains(status)) throw new ValidationAppException("Unknown status.");
        var t = await _db.SupportTickets.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Ticket not found.");
        t.Status = status;
        t.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("support.status", "ticket", t.Id.ToString(), details: $"{t.Subject} -> {status}", ct: ct);
    }
}
