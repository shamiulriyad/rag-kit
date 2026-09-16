namespace Backend.Models;

/// <summary>One attempt (or series of retried attempts) to run a <see cref="Document"/>
/// through the Python RAG pipeline. Exists so upload/reprocess can return immediately
/// (spec: "do not process large documents inside the HTTP request") while
/// <see cref="Backend.BackgroundJobs.DocumentProcessingBackgroundService"/> does the actual
/// work off the request thread, with retry/timeout/status tracking.</summary>
public class DocumentProcessingJob
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    public Guid KnowledgeBaseId { get; set; }

    /// <summary>Reuses Document's Queued/Processing/Completed/Failed vocabulary.</summary>
    public DocumentStatus Status { get; set; } = DocumentStatus.Queued;

    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; } = 3;
    public string? ErrorMessage { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}
