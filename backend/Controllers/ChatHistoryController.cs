using Backend.DTOs.Chat;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Same underlying ChatSession entity as ChatController, exposed the way the
/// frontend's history views expect: list/search/rename/delete (spec section 16).</summary>
[Route("api/chat-history")]
[Tags("Chat")]
[Authorize]
public class ChatHistoryController : ApiControllerBase
{
    private readonly IChatService _chat;

    public ChatHistoryController(IChatService chat) => _chat = chat;

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
    {
        var (items, total) = await _chat.ListSessionsAsync(CurrentUserId, Backend.DTOs.Common.PageQuery.From(page, pageSize), ct);
        return Paged(items, total);
    }

    [HttpGet("search")]
    public async Task<ActionResult> Search([FromQuery] string q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
    {
        var (items, total) = await _chat.SearchSessionsAsync(CurrentUserId, q ?? "", Backend.DTOs.Common.PageQuery.From(page, pageSize), ct);
        return Paged(items, total);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Rename(Guid id, [FromBody] RenameChatSessionRequest request, CancellationToken ct) =>
        Success(await _chat.RenameSessionAsync(id, CurrentUserId, request, ct), "Conversation renamed.");

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _chat.DeleteSessionAsync(id, CurrentUserId, ct);
        return Success("Conversation deleted.");
    }
}
