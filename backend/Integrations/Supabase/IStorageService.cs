namespace Backend.Integrations.Supabase;

/// <summary>Abstraction over "where uploaded PDFs live" so Supabase Storage can be swapped
/// for S3-compatible storage later without touching callers (spec section 9). Implementations:
/// <see cref="SupabaseStorageService"/> (production) and <see cref="LocalDiskStorageService"/>
/// (zero-config local dev fallback, auto-selected in Program.cs when Supabase isn't configured).</summary>
public interface IStorageService
{
    /// <summary>Uploads <paramref name="content"/> to <paramref name="path"/> (e.g.
    /// "documents/{userId}/{knowledgeBaseId}/{documentId}.pdf") and returns the stored path -
    /// never a public URL, never the file itself, just what <see cref="Models.Document.StoragePath"/> stores.</summary>
    Task<string> UploadAsync(string path, Stream content, string contentType, CancellationToken ct);

    Task<Stream> DownloadAsync(string path, CancellationToken ct);

    Task DeleteAsync(string path, CancellationToken ct);
}
