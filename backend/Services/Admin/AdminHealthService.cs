using System.Diagnostics;
using Backend.Data;
using Backend.DTOs.Admin;
using Backend.Integrations.PythonRag;
using Backend.Integrations.Supabase;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminHealthService
{
    Task<AdminHealthResponse> CheckAsync(CancellationToken ct);
}

/// <summary>Live probes, run when the page asks. Status is "unknown" - never a guess of
/// "healthy" - for anything this process cannot observe: Qdrant and the embedding model are
/// only visible through the Python service's own /health, and the LLM provider is not called
/// unless a user asks a question. Past incidents are not stored anywhere yet.</summary>
public class AdminHealthService : IAdminHealthService
{
    private static readonly TimeSpan StuckQueueAfter = TimeSpan.FromMinutes(5);

    private readonly AppDbContext _db;
    private readonly IStorageService _storage;
    private readonly IRagService _rag;

    public AdminHealthService(AppDbContext db, IStorageService storage, IRagService rag)
    {
        _db = db;
        _storage = storage;
        _rag = rag;
    }

    public async Task<AdminHealthResponse> CheckAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var list = new List<ServiceHealth> { new("api", "ASP.NET API", "healthy", 0, now, "Serving this request.") };

        var (dbOk, dbMs) = await TimeAsync(async () => await _db.Database.CanConnectAsync(ct));
        list.Add(new("database", "Database", dbOk ? "healthy" : "down", dbMs, now, dbOk ? "Connection succeeded." : "Cannot connect."));

        var (stOk, stMs) = await TimeAsync(() => _storage.IsHealthyAsync(ct));
        list.Add(new("storage", "Storage", stOk ? "healthy" : "down", stMs, now, stOk ? "Bucket reachable." : "Storage check failed."));

        var sw = Stopwatch.StartNew();
        var rag = await _rag.GetHealthAsync(ct);
        sw.Stop();
        list.Add(new("rag", "Python RAG service", rag.Reachable ? "healthy" : "down", sw.ElapsedMilliseconds, now,
            rag.Reachable ? "Responded to /health." : "Unreachable."));

        list.Add(new("qdrant", "Qdrant", rag.Reachable ? (rag.Qdrant == "ok" ? "healthy" : rag.Qdrant == "down" ? "down" : "unknown") : "unknown",
            null, now, rag.Reachable ? $"Reported by the RAG service: {rag.Qdrant ?? "no value"}." : "Cannot be checked while the RAG service is unreachable."));

        list.Add(new("embedding", "Embedding provider", rag.Reachable ? (rag.Ready ? "healthy" : "degraded") : "unknown", null, now,
            rag.Reachable ? (rag.Ready ? "Embedding model loaded." : "Model still loading.") : "Cannot be checked while the RAG service is unreachable."));

        list.Add(new("llm", "LLM provider", "unknown", null, now,
            "Not probed: the LLM is only called when a user asks a question, and no synthetic calls are made."));

        list.Add(await WorkerAsync(now, ct));
        return new AdminHealthResponse(list, IncidentsTracked: false);
    }

    private async Task<ServiceHealth> WorkerAsync(DateTimeOffset now, CancellationToken ct)
    {
        var oldest = await _db.DocumentProcessingJobs.Where(j => j.Status == DocumentStatus.Queued)
            .OrderBy(j => j.CreatedAt).Select(j => (DateTimeOffset?)j.CreatedAt).FirstOrDefaultAsync(ct);
        if (oldest is null) return new("worker", "Background worker", "healthy", null, now, "Queue is empty.");

        var waiting = now - oldest.Value;
        return waiting > StuckQueueAfter
            ? new("worker", "Background worker", "degraded", null, now,
                $"Oldest queued job has waited {(int)waiting.TotalMinutes} min - the worker may be stalled or behind.")
            : new("worker", "Background worker", "healthy", null, now, "Jobs are being picked up.");
    }

    private static async Task<(bool ok, long ms)> TimeAsync(Func<Task<bool>> check)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            return (await check(), sw.ElapsedMilliseconds);
        }
        catch
        {
            return (false, sw.ElapsedMilliseconds);
        }
    }
}
