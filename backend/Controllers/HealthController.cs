using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IRagService _rag;

    public HealthController(IRagService rag) => _rag = rag;

    /// <summary>
    /// GET /api/health - "ok" as soon as this API answers. Also reports whether
    /// the Python RAG service behind it is reachable.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var ragUp = await _rag.IsHealthyAsync(ct);
        return Ok(new { status = "ok", rag = ragUp ? "ok" : "unreachable" });
    }
}
