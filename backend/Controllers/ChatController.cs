using Backend.DTOs.Chat;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/chat")]
[Tags("Chat")]
[Authorize]
public class ChatController : ApiControllerBase
{
    private readonly IChatService _chat;

    public ChatController(IChatService chat) => _chat = chat;

    [HttpPost("sessions")]
    public async Task<ActionResult> CreateSession([FromBody] CreateChatSessionRequest request, CancellationToken ct) =>
        Success(await _chat.CreateSessionAsync(CurrentUserId, request, ct), "Conversation started.");

    [HttpGet("sessions")]
    public async Task<ActionResult> ListSessions(CancellationToken ct) => Success(await _chat.ListSessionsAsync(CurrentUserId, ct));

    [HttpGet("sessions/{id:guid}")]
    public async Task<ActionResult> GetSession(Guid id, CancellationToken ct) => Success(await _chat.GetSessionAsync(id, CurrentUserId, ct));

    [HttpDelete("sessions/{id:guid}")]
    public async Task<ActionResult> DeleteSession(Guid id, CancellationToken ct)
    {
        await _chat.DeleteSessionAsync(id, CurrentUserId, ct);
        return Success("Conversation deleted.");
    }

    /// <summary>POST /api/chat/sessions/{id}/messages - ask a question against the
    /// session's Knowledge Base. Validates the caller + Knowledge Base, checks the
    /// monthly question limit, forwards to Python, then persists the exchange.</summary>
    [HttpPost("sessions/{id:guid}/messages")]
    public async Task<ActionResult> Ask(Guid id, [FromBody] AskMessageRequest request, CancellationToken ct) =>
        Success(await _chat.AskAsync(id, CurrentUserId, request, ct));
}
