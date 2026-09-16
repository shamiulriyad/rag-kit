namespace Backend.Models;

/// <summary>Metadata for one uploaded PDF. The binary itself lives in Supabase Storage
/// (see Integrations/Supabase/IStorageService) - never in this table.</summary>
public class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid KnowledgeBaseId { get; set; }
    public KnowledgeBase? KnowledgeBase { get; set; }

    public Guid UploadedBy { get; set; }
    public User? UploadedByUser { get; set; }

    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string FileType { get; set; } = "application/pdf";

    /// <summary>Path inside the storage bucket, e.g. documents/{workspaceId}/{kbId}/{documentId}.pdf
    /// (falls back to the Knowledge Base owner's user id for personal, non-workspace KBs).
    /// Never a public URL and never the file itself.</summary>
    public string StoragePath { get; set; } = string.Empty;

    public DocumentStatus Status { get; set; } = DocumentStatus.Queued;

    public int? PageCount { get; set; }
    public int? ChunkCount { get; set; }
    public string? ErrorMessage { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ProcessedAt { get; set; }
}
