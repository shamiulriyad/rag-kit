using Backend.Data;
using Backend.Integrations.PythonRag;
using Backend.Integrations.Supabase;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>GET /api/health - checks API, database, storage, Python RAG service, and (via
/// Python) Qdrant/LLM, per spec section 34. No secrets or infrastructure details are ever
/// returned.</summary>
[Route("api/health")]
[Tags("Health")]
public class HealthController : ControllerBase
{
    private readonly IRagService _rag;
    private readonly IStorageService _storage;
    private readonly AppDbContext _db;

    public HealthController(IRagService rag, IStorageService storage, AppDbContext db)
    {
        _rag = rag;
        _storage = storage;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var dbHealthy = await SafeCanConnectAsync(ct);
        var storageHealthy = await SafeAsync(() => _storage.IsHealthyAsync(ct));
        var ragHealthy = await _rag.IsHealthyAsync(ct);

        return Ok(new
        {
            api = "healthy",
            database = dbHealthy ? "healthy" : "unhealthy",
            storage = storageHealthy ? "healthy" : "unhealthy",
            rag = ragHealthy ? "healthy" : "unreachable",
            // The .NET layer never talks to Qdrant or Gemini directly (spec: Python owns RAG
            // processing) - their status is only known through the RAG service's own /health.
            qdrant = ragHealthy ? "healthy" : "unknown",
            llm = ragHealthy ? "healthy" : "unknown",
        });
    }

    private static async Task<bool> SafeAsync(Func<Task<bool>> check)
    {
        try
        {
            return await check();
        }
        catch
        {
            return false;
        }
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
