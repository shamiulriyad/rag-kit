using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Backend.Configuration;
using Backend.Helpers;

namespace Backend.Integrations.PythonRag;

/// <summary>Talks to the Python RAG service. This is the only place that knows its wire
/// format - controllers/services see clean DTOs. Every call is scoped to one Knowledge
/// Base's Qdrant collection (spec section 13: every retrieval query MUST filter by the
/// current Knowledge Base) - React never calls Python directly (spec section 35).</summary>
public interface IRagService
{
    Task<bool> IsHealthyAsync(CancellationToken ct = default);

    Task<RagIngestResult> IngestAsync(
        string collectionName, Guid documentId, Stream pdf, string fileName,
        int chunkSize, int chunkOverlap, CancellationToken ct = default);

    Task<RagQueryResult> QueryAsync(
        string collectionName, string question, int topK, double? similarityThreshold, CancellationToken ct = default);

    Task DeleteDocumentAsync(string collectionName, Guid documentId, CancellationToken ct = default);

    Task DeleteCollectionAsync(string collectionName, CancellationToken ct = default);
}

/// <summary>Raised when the Python RAG service returns an error or cannot be reached.</summary>
public class RagException : Exception
{
    public int StatusCode { get; }

    public RagException(string message, int statusCode = StatusCodes.Status502BadGateway)
        : base(message) => StatusCode = statusCode;
}

public class RagService : IRagService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;
    private readonly ILogger<RagService> _log;

    public RagService(HttpClient http, ILogger<RagService> log)
    {
        _http = http;
        _log = log;
    }

    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        try
        {
            using var res = await _http.GetAsync("/health", ct);
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Python RAG service health check failed");
            return false;
        }
    }

    public async Task<RagIngestResult> IngestAsync(
        string collectionName, Guid documentId, Stream pdf, string fileName,
        int chunkSize, int chunkOverlap, CancellationToken ct = default)
    {
        // Raw streamed body (not multipart): nothing buffers the whole PDF, and no
        // multipart part-size limit applies on the Python side.
        using var body = new StreamContent(pdf);
        body.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

        var url = $"/api/kb/{collectionName}/ingest"
                  + $"?document_id={documentId}&filename={Uri.EscapeDataString(fileName)}"
                  + $"&chunk_size={chunkSize}&chunk_overlap={chunkOverlap}";

        using var res = await SendAsync(() => _http.PostAsync(url, body, ct), "ingest");
        await EnsureOkAsync(res, "ingest", ct);

        return await res.Content.ReadFromJsonAsync<RagIngestResult>(Json, ct)
               ?? throw new RagException("Empty response from the RAG service.");
    }

    public async Task<RagQueryResult> QueryAsync(
        string collectionName, string question, int topK, double? similarityThreshold, CancellationToken ct = default)
    {
        var payload = new { question, top_k = topK, similarity_threshold = similarityThreshold };
        using var body = new StringContent(JsonSerializer.Serialize(payload, Json), Encoding.UTF8, "application/json");

        using var res = await SendAsync(() => _http.PostAsync($"/api/kb/{collectionName}/query", body, ct), "query");
        await EnsureOkAsync(res, "query", ct);

        return await res.Content.ReadFromJsonAsync<RagQueryResult>(Json, ct)
               ?? throw new RagException("Empty response from the RAG service.");
    }

    public async Task DeleteDocumentAsync(string collectionName, Guid documentId, CancellationToken ct = default)
    {
        using var res = await SendAsync(
            () => _http.DeleteAsync($"/api/kb/{collectionName}/documents/{documentId}", ct), "delete-document");
        // A collection that was never created (e.g. ingest failed before it existed) is not an error here.
        if (res.StatusCode != System.Net.HttpStatusCode.NotFound)
            await EnsureOkAsync(res, "delete-document", ct);
    }

    public async Task DeleteCollectionAsync(string collectionName, CancellationToken ct = default)
    {
        using var res = await SendAsync(() => _http.DeleteAsync($"/api/kb/{collectionName}", ct), "delete-collection");
        if (res.StatusCode != System.Net.HttpStatusCode.NotFound)
            await EnsureOkAsync(res, "delete-collection", ct);
    }

    private async Task<HttpResponseMessage> SendAsync(Func<Task<HttpResponseMessage>> send, string op)
    {
        try
        {
            return await send();
        }
        catch (TaskCanceledException)
        {
            throw new RagException(
                $"The RAG service timed out during '{op}'. A large PDF can take a while to embed.",
                StatusCodes.Status504GatewayTimeout);
        }
        catch (HttpRequestException ex)
        {
            _log.LogError(ex, "Cannot reach the Python RAG service");
            throw new RagException(
                "Cannot reach the Python RAG service. Is it running? (cd rag && uvicorn main:app --port 8000)",
                StatusCodes.Status502BadGateway);
        }
    }

    private async Task EnsureOkAsync(HttpResponseMessage res, string op, CancellationToken ct)
    {
        if (res.IsSuccessStatusCode) return;

        var raw = await res.Content.ReadAsStringAsync(ct);
        var detail = TryExtractMessage(raw);
        _log.LogError("RAG {Op} failed ({Status}): {Detail}", op, (int)res.StatusCode, detail ?? raw);

        // Pass the Python status code and its own message straight through, so React
        // shows "This PDF appears to be scanned..." rather than a generic wrapper.
        throw new RagException(
            detail ?? $"The RAG service failed during '{op}' (HTTP {(int)res.StatusCode}).",
            (int)res.StatusCode);
    }

    /// <summary>FastAPI errors are {"detail": ...}; ours are {"message": ...}. Surface either.</summary>
    private static string? TryExtractMessage(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            if (root.TryGetProperty("detail", out var d)) return d.ToString();
            if (root.TryGetProperty("message", out var m)) return m.ToString();
            return null;
        }
        catch
        {
            return null;
        }
    }
}
