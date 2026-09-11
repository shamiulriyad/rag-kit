using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public record NotificationResponse(Guid Id, string Type, string Title, string Message, bool IsRead, DateTimeOffset CreatedAt);

public interface INotificationService
{
    Task PushAsync(Guid userId, NotificationType type, string title, string message, CancellationToken ct);
    Task<List<NotificationResponse>> ListAsync(Guid userId, CancellationToken ct);
    Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct);
}

/// <summary>In-app notifications (spec section 20) - document processed/failed, usage
/// limits, subscription changes, team invitations.</summary>
public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db) => _db = db;

    public async Task PushAsync(Guid userId, NotificationType type, string title, string message, CancellationToken ct)
    {
        _db.Notifications.Add(new Notification { UserId = userId, Type = type, Title = title, Message = message });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<NotificationResponse>> ListAsync(Guid userId, CancellationToken ct) =>
        await _db.Notifications.Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationResponse(n.Id, n.Type.ToString(), n.Title, n.Message, n.IsRead, n.CreatedAt))
            .ToListAsync(ct);

    public async Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, ct)
            ?? throw new NotFoundException("Notification not found.");
        notification.IsRead = true;
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct)
    {
        await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }
}
