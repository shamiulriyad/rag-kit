using Backend.DTOs.Support;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Admin;

[Tags("Admin - Support")]
[Route("api/admin/support")]
public class AdminSupportController(ISupportService support) : AdminControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List(
        [FromQuery] string? status, [FromQuery] string? search, [FromQuery] Guid? userId,
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await support.ListAllAsync(status, search, userId, page, pageSize is > 0 ? pageSize : 20, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await support.GetAdminAsync(id, ct));

    [HttpPost("{id:guid}/reply")]
    public async Task<ActionResult> Reply(Guid id, [FromBody] TicketMessageRequest request, CancellationToken ct) =>
        Success(await support.StaffReplyAsync(id, request.Body, ct), "Reply sent.");

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult> Status(Guid id, [FromBody] AdminTicketStatusRequest request, CancellationToken ct)
    {
        await support.SetStatusAsync(id, request.Status, ct);
        return Success("Status updated.");
    }
}
