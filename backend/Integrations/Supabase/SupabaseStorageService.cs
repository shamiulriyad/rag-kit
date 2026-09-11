using System.Net.Http.Headers;
using Backend.Helpers;
using Microsoft.Extensions.Options;

namespace Backend.Integrations.Supabase;

/// <summary>Talks to the Supabase Storage REST API directly (no SDK dependency - it's a
/// handful of HTTP calls). Uses the service-role key, which never leaves this backend.</summary>
public class SupabaseStorageService : IStorageService
{
    private readonly HttpClient _http;
    private readonly SupabaseOptions _options;
    private readonly ILogger<SupabaseStorageService> _log;

    public SupabaseStorageService(HttpClient http, IOptions<SupabaseOptions> options, ILogger<SupabaseStorageService> log)
    {
        _options = options.Value;
        _log = log;

        http.BaseAddress = new Uri(_options.Url.TrimEnd('/') + "/");
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        http.DefaultRequestHeaders.Add("apikey", _options.ServiceRoleKey);
        _http = http;
    }

    public async Task<string> UploadAsync(string path, Stream content, string contentType, CancellationToken ct)
    {
        using var body = new StreamContent(content);
        body.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        // upsert=true: a re-upload with the same document id overwrites cleanly (reprocess flow).
        var url = $"storage/v1/object/{_options.StorageBucket}/{path}";
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = body };
        request.Headers.Add("x-upsert", "true");

        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(ct);
            _log.LogError("Supabase Storage upload failed ({Status}): {Detail}", response.StatusCode, detail);
            throw new AppException("Could not store the uploaded file. Try again shortly.", StatusCodes.Status502BadGateway);
        }

        return path;
    }

    public async Task<Stream> DownloadAsync(string path, CancellationToken ct)
    {
        var response = await _http.GetAsync($"storage/v1/object/{_options.StorageBucket}/{path}", ct);
        if (!response.IsSuccessStatusCode)
            throw new NotFoundException("Stored file not found.");

        return await response.Content.ReadAsStreamAsync(ct);
    }

    public async Task DeleteAsync(string path, CancellationToken ct)
    {
        using var response = await _http.DeleteAsync($"storage/v1/object/{_options.StorageBucket}/{path}", ct);
        // A missing object is not an error here - delete is called during cleanup paths too.
        if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
        {
            var detail = await response.Content.ReadAsStringAsync(ct);
            _log.LogWarning("Supabase Storage delete failed ({Status}): {Detail}", response.StatusCode, detail);
        }
    }
}
