using Backend.Data;
using Backend.Integrations.PythonRag;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>GET /api/health - checks API, database, Python RAG service, and (via Python)
/// Qdrant, per spec section 34. No secrets or infrastructure details are ever returned.</summary>
[Route("api/health")]
[Tags("Health")]
public class HealthController : ControllerBase
{
    private readonly IRagService _rag;
    private readonly AppDbContext _db;

    public HealthController(IRagService rag, AppDbContext db)
    {
        _rag = rag;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var dbHealthy = await SafeCanConnectAsync(ct);
        var ragHealthy = await _rag.IsHealthyAsync(ct);

        return Ok(new
        {
            api = "healthy",
            database = dbHealthy ? "healthy" : "unhealthy",
            rag = ragHealthy ? "healthy" : "unreachable",
            // The .NET layer never talks to Qdrant directly (spec: Python owns RAG
            // processing) - its status is only known through the RAG service's own /health.
            qdrant = ragHealthy ? "healthy" : "unknown",
        });
    }

    private async Task<bool> SafeCanConnectAsync(CancellationToken ct)
    {
        try
        {
            return await _db.Database.CanConnectAsync(ct);
        }
        catch
        {
            return false;
        }
    }
}
