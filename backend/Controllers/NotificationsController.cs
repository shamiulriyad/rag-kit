using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/notifications")]
[Tags("Notifications")]
[Authorize]
public class NotificationsController : ApiControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications) => _notifications = notifications;

    [HttpGet]
    public async Task<ActionResult> List(CancellationToken ct) => Success(await _notifications.ListAsync(CurrentUserId, ct));

    [HttpPut("{id:guid}/read")]
    public async Task<ActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await _notifications.MarkReadAsync(id, CurrentUserId, ct);
        return Success();
    }

    [HttpPut("read-all")]
    public async Task<ActionResult> MarkAllRead(CancellationToken ct)
    {
        await _notifications.MarkAllReadAsync(CurrentUserId, ct);
        return Success();
    }
}
