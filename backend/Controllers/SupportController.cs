using Backend.DTOs.Support;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>A customer's own support tickets. Every query is scoped to the signed-in user.</summary>
[Route("api/support")]
[Tags("Support")]
[Authorize]
public class SupportController(ISupportService support, ICurrentUserService current) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List(CancellationToken ct) => Success(await support.ListMineAsync(CurrentUserId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await support.GetMineAsync(CurrentUserId, id, ct));

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateTicketRequest request, CancellationToken ct) =>
        Success(await support.CreateAsync(CurrentUserId, current.Email, request, ct), "Ticket created.");

    [HttpPost("{id:guid}/messages")]
    public async Task<ActionResult> Reply(Guid id, [FromBody] TicketMessageRequest request, CancellationToken ct) =>
        Success(await support.ReplyMineAsync(CurrentUserId, current.Email, id, request.Body, ct));

    [HttpPost("{id:guid}/close")]
    public async Task<ActionResult> Close(Guid id, CancellationToken ct)
    {
        await support.CloseMineAsync(CurrentUserId, id, ct);
        return Success("Ticket closed.");
    }
}
