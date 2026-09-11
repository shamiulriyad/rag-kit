namespace Backend.Integrations.Supabase;

/// <summary>Zero-config fallback used when SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are not
/// set (see Program.cs), so `docker compose up` and local dev work before anyone has
/// configured a real Supabase project. Same <see cref="IStorageService"/> contract, so
/// swapping in real Supabase Storage later needs no caller changes.</summary>
public class LocalDiskStorageService : IStorageService
{
    private readonly string _root;
    private readonly ILogger<LocalDiskStorageService> _log;

    public LocalDiskStorageService(IConfiguration config, ILogger<LocalDiskStorageService> log)
    {
        _root = config["Storage:LocalRoot"] ?? "storage_data";
        Directory.CreateDirectory(_root);
        _log = log;
        _log.LogWarning(
            "Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) - " +
            "storing uploaded files on local disk under '{Root}'. Fine for local development; " +
            "configure Supabase before deploying.", _root);
    }

    public async Task<string> UploadAsync(string path, Stream content, string contentType, CancellationToken ct)
    {
        var full = ResolveAndEnsureDir(path);
        await using var file = File.Create(full);
        await content.CopyToAsync(file, ct);
        return path;
    }

    public Task<Stream> DownloadAsync(string path, CancellationToken ct)
    {
        var full = Resolve(path);
        if (!File.Exists(full)) throw new Helpers.NotFoundException("Stored file not found.");
        return Task.FromResult<Stream>(File.OpenRead(full));
    }

    public Task DeleteAsync(string path, CancellationToken ct)
    {
        var full = Resolve(path);
        if (File.Exists(full)) File.Delete(full);
        return Task.CompletedTask;
    }

    private string Resolve(string path) => Path.Combine(_root, path.Replace('/', Path.DirectorySeparatorChar));

    private string ResolveAndEnsureDir(string path)
    {
        var full = Resolve(path);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        return full;
    }
}
