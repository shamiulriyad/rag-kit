using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Models;

namespace Backend.Services;

/// <summary>Talks to the Python RAG service. This is the only place that knows
/// the Python wire format; controllers see the clean <see cref="Backend.Models"/> types.</summary>
public interface IRagService
{
    Task<bool> IsHealthyAsync(CancellationToken ct = default);
    Task<ChatResponse> AskAsync(ChatRequest request, CancellationToken ct = default);
    Task<DocumentResponse> IngestAsync(Stream pdf, string fileName, CancellationToken ct = default);
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

    public async Task<ChatResponse> AskAsync(ChatRequest request, CancellationToken ct = default)
    {
        var payload = new { question = request.Question, top_k = request.TopK };
        using var body = new StringContent(
            JsonSerializer.Serialize(payload, Json), Encoding.UTF8, "application/json");

        using var res = await SendAsync(() => _http.PostAsync("/query", body, ct), "query");
        await EnsureOkAsync(res, "query", ct);

        var wire = await res.Content.ReadFromJsonAsync<PyAnswer>(Json, ct)
                   ?? throw new RagException("Empty response from the RAG service.");

        return new ChatResponse
        {
            Answer = wire.Answer,
            Sources = wire.Sources.ConvertAll(s => new Source
            {
                Page = s.Page,
                Document = s.Source,
                Score = s.Score,
            }),
        };
    }

    public async Task<DocumentResponse> IngestAsync(Stream pdf, string fileName, CancellationToken ct = default)
    {
        using var form = new MultipartFormDataContent();
        using var file = new StreamContent(pdf);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(file, "file", fileName);

        using var res = await SendAsync(() => _http.PostAsync("/ingest", form, ct), "ingest");
        await EnsureOkAsync(res, "ingest", ct);

        return await res.Content.ReadFromJsonAsync<DocumentResponse>(Json, ct)
               ?? throw new RagException("Empty response from the RAG service.");
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
                "Cannot reach the Python RAG service. Is it running? " +
                "(cd rag && uvicorn main:app --port 8000)",
                StatusCodes.Status502BadGateway);
        }
    }

    private async Task EnsureOkAsync(HttpResponseMessage res, string op, CancellationToken ct)
    {
        if (res.IsSuccessStatusCode) return;

        var raw = await res.Content.ReadAsStringAsync(ct);
        var detail = TryExtractDetail(raw) ?? raw;
        _log.LogError("RAG {Op} failed ({Status}): {Detail}", op, (int)res.StatusCode, detail);
        throw new RagException(
            $"RAG service '{op}' failed ({(int)res.StatusCode}): {detail}",
            (int)res.StatusCode);
    }

    /// <summary>FastAPI puts errors in {"detail": ...}; surface just that when present.</summary>
    private static string? TryExtractDetail(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("detail", out var d) ? d.ToString() : null;
        }
        catch
        {
            return null;
        }
    }

    // --- Python wire format (only used here) ---
    private sealed record PyAnswer(
        [property: JsonPropertyName("answer")] string Answer,
        [property: JsonPropertyName("sources")] List<PySource> Sources);

    private sealed record PySource(
        [property: JsonPropertyName("page")] int? Page,
        [property: JsonPropertyName("source")] string Source,
        [property: JsonPropertyName("score")] double Score);
}
