using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IRagService _rag;

    public ChatController(IRagService rag) => _rag = rag;

    /// <summary>
    /// POST /api/chat - forward a question to the Python RAG service and return
    /// its answer plus sources. No RAG logic lives here.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ChatResponse>> Post([FromBody] ChatRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest(new { error = "question is required" });

        var answer = await _rag.AskAsync(request, ct);
        return Ok(answer);
    }
}
