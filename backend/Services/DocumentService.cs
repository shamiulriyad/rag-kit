using Backend.Authorization;
using Backend.Data;
using Backend.DTOs.Documents;
using Backend.Helpers;
using Backend.Integrations.PythonRag;
using Backend.Integrations.Supabase;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IDocumentService
{
    Task<List<DocumentResponse>> ListAsync(Guid knowledgeBaseId, Guid userId, CancellationToken ct);
    Task<DocumentResponse> GetAsync(Guid id, Guid userId, CancellationToken ct);
    Task<DocumentResponse> UploadAsync(Guid knowledgeBaseId, Guid userId, IFormFile file, CancellationToken ct);
    Task DeleteAsync(Guid id, Guid userId, CancellationToken ct);
    Task<DocumentResponse> ReprocessAsync(Guid id, Guid userId, CancellationToken ct);

    // Used only by BackgroundJobs/DocumentProcessingBackgroundService - not exposed on any
    // controller. Upload/Reprocess just enqueue a DocumentProcessingJob and return
    // immediately (spec: "do not process large documents inside the HTTP request").
    Task<Guid?> ClaimNextQueuedJobAsync(CancellationToken ct);
    Task ProcessJobAsync(Guid jobId, CancellationToken ct);
}

/// <summary>Owns the upload -> store -> enqueue and the actual ingest -> update-status flow
/// (spec section 10). No PDF extraction/chunking/embedding logic here - that's Python's job;
/// this service only orchestrates storage + the RAG service call + job/retry bookkeeping.</summary>
public class DocumentService : IDocumentService
{
    private static readonly string[] AllowedExtensions = [".pdf"];

    private readonly AppDbContext _db;
    private readonly IResourceAuthorizationService _auth;
    private readonly IPlanLimitService _limits;
    private readonly IStorageService _storage;
    private readonly IRagService _rag;
    private readonly IActivityLogService _activity;
    private readonly INotificationService _notifications;
    private readonly ILogger<DocumentService> _log;

    public DocumentService(
        AppDbContext db, IResourceAuthorizationService auth, IPlanLimitService limits,
        IStorageService storage, IRagService rag, IActivityLogService activity,
        INotificationService notifications, ILogger<DocumentService> log)
    {
        _db = db;
        _auth = auth;
        _limits = limits;
        _storage = storage;
        _rag = rag;
        _activity = activity;
        _notifications = notifications;
        _log = log;
    }

    public async Task<List<DocumentResponse>> ListAsync(Guid knowledgeBaseId, Guid userId, CancellationToken ct)
    {
        await _auth.GetKnowledgeBaseAsync(knowledgeBaseId, userId, ct: ct);
        var docs = await _db.Documents.Where(d => d.KnowledgeBaseId == knowledgeBaseId)
            .OrderByDescending(d => d.CreatedAt).ToListAsync(ct);
        return docs.Select(Map).ToList();
    }

    public async Task<DocumentResponse> GetAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var doc = await _auth.GetDocumentAsync(id, userId, ct);
        return Map(doc);
    }

    public async Task<DocumentResponse> UploadAsync(Guid knowledgeBaseId, Guid userId, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw new ValidationAppException("Attach a PDF in the 'file' field.");

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase))
            throw new ValidationAppException("Only .pdf files are supported.");

        await using (var probe = file.OpenReadStream())
        {
            var header = new byte[5];
            var read = await probe.ReadAsync(header, ct);
            if (read < 5 || System.Text.Encoding.ASCII.GetString(header) != "%PDF-")
                throw new ValidationAppException("That file is not a valid PDF.");
        }

        var kb = await _auth.GetKnowledgeBaseAsync(knowledgeBaseId, userId, ct: ct);
        await _limits.EnsureCanUploadDocumentAsync(kb.OwnerId, file.Length, ct);

        var document = new Document
        {
            KnowledgeBaseId = knowledgeBaseId,
            UploadedBy = userId,
            FileName = Path.GetFileName(file.FileName),
            FileSize = file.Length,
            FileType = "application/pdf",
            Status = DocumentStatus.Uploading,
        };
        _db.Documents.Add(document);
        await _db.SaveChangesAsync(ct);

        // Workspace-owned KBs are scoped by workspace; personal KBs (no workspace) fall back
        // to the owner's user id so documents still land under a stable, unambiguous prefix.
        var storagePath = $"documents/{kb.WorkspaceId?.ToString() ?? kb.OwnerId.ToString()}/{knowledgeBaseId}/{document.Id}.pdf";

        try
        {
            await using (var uploadStream = file.OpenReadStream())
                await _storage.UploadAsync(storagePath, uploadStream, "application/pdf", ct);

            document.StoragePath = storagePath;
            document.Status = DocumentStatus.Queued;
            document.UpdatedAt = DateTimeOffset.UtcNow;
            _db.DocumentProcessingJobs.Add(new DocumentProcessingJob { DocumentId = document.Id, KnowledgeBaseId = knowledgeBaseId });
            await _db.SaveChangesAsync(ct);

            await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentUploaded, "Document", document.Id.ToString(),
                new { document.FileName, kb.Id }, ct);

            // Processing happens off the request thread - see BackgroundJobs/DocumentProcessingBackgroundService.
            return Map(document);
        }
        catch (Exception ex) when (ex is AppException)
        {
            document.Status = DocumentStatus.Failed;
            document.ErrorMessage = ex.Message;
            document.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);

            await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentFailed, "Document", document.Id.ToString(),
                new { document.FileName, Reason = ex.Message }, ct);

            throw;
        }
    }

    public async Task DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var doc = await _auth.GetDocumentAsync(id, userId, ct);
        var kb = doc.KnowledgeBase!;

        if (!string.IsNullOrEmpty(doc.StoragePath))
            await _storage.DeleteAsync(doc.StoragePath, ct);

        try
        {
            await _rag.DeleteDocumentAsync(kb.QdrantCollectionName, doc.Id, ct);
        }
        catch (RagException ex)
        {
            _log.LogWarning(ex, "Could not delete vectors for document {DocId}", doc.Id);
        }

        kb.DocumentCount = Math.Max(0, kb.DocumentCount - 1);
        kb.ChunkCount = Math.Max(0, kb.ChunkCount - (doc.ChunkCount ?? 0));
        kb.UpdatedAt = DateTimeOffset.UtcNow;

        _db.Documents.Remove(doc);
        await _db.SaveChangesAsync(ct);

        await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentDeleted, "Document", id.ToString(),
            new { doc.FileName }, ct);
    }

    public async Task<DocumentResponse> ReprocessAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var doc = await _auth.GetDocumentAsync(id, userId, ct);

        if (string.IsNullOrEmpty(doc.StoragePath))
            throw new ValidationAppException("This document has no stored file to reprocess.");

        doc.Status = DocumentStatus.Queued;
        doc.ErrorMessage = null;
        doc.UpdatedAt = DateTimeOffset.UtcNow;
        _db.DocumentProcessingJobs.Add(new DocumentProcessingJob { DocumentId = doc.Id, KnowledgeBaseId = doc.KnowledgeBaseId });
        await _db.SaveChangesAsync(ct);

        // Processing happens off the request thread - see BackgroundJobs/DocumentProcessingBackgroundService.
        return Map(doc);
    }

    public async Task<Guid?> ClaimNextQueuedJobAsync(CancellationToken ct)
    {
        var job = await _db.DocumentProcessingJobs
            .Where(j => j.Status == DocumentStatus.Queued)
            .OrderBy(j => j.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (job is null) return null;

        job.Status = DocumentStatus.Processing;
        job.AttemptCount++;
        job.StartedAt = DateTimeOffset.UtcNow;
        job.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return job.Id;
    }

    public async Task ProcessJobAsync(Guid jobId, CancellationToken ct)
    {
        var job = await _db.DocumentProcessingJobs
            .Include(j => j.Document).ThenInclude(d => d!.KnowledgeBase)
            .FirstOrDefaultAsync(j => j.Id == jobId, ct);
        var document = job?.Document;
        var kb = document?.KnowledgeBase;
        if (job is null || document is null || kb is null)
        {
            _log.LogWarning("Processing job {JobId} has no document/knowledge base - skipping.", jobId);
            return;
        }

        document.Status = DocumentStatus.Processing;
        document.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        try
        {
            await _rag.DeleteDocumentAsync(kb.QdrantCollectionName, document.Id, ct); // drop any stale chunks first
            var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == kb.OwnerId, ct);

            await using var pdf = await _storage.DownloadAsync(document.StoragePath, ct);
            var result = await _rag.IngestAsync(
                kb.QdrantCollectionName, document.Id, pdf, document.FileName,
                settings?.ChunkSize ?? 1000, settings?.ChunkOverlap ?? 150, ct);

            // Counted once, the first time a document is ever successfully processed - not
            // on every reprocess/retry.
            var firstSuccess = document.ProcessedAt is null;
            kb.ChunkCount = kb.ChunkCount - (document.ChunkCount ?? 0) + result.Chunks;
            if (firstSuccess) kb.DocumentCount++;
            kb.UpdatedAt = DateTimeOffset.UtcNow;

            document.PageCount = result.Pages;
            document.ChunkCount = result.Chunks;
            document.Status = DocumentStatus.Completed;
            document.ProcessedAt = DateTimeOffset.UtcNow;
            document.UpdatedAt = DateTimeOffset.UtcNow;

            job.Status = DocumentStatus.Completed;
            job.CompletedAt = DateTimeOffset.UtcNow;
            job.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync(ct);

            if (firstSuccess)
                await _limits.RecordDocumentUploadedAsync(kb.OwnerId, document.FileSize, ct);
            await _limits.RecordDocumentChunkedAsync(kb.OwnerId, result.Chunks, ct);
            await _activity.LogAsync(document.UploadedBy, kb.WorkspaceId, ActivityAction.DocumentProcessed, "Document", document.Id.ToString(), ct: ct);
            await _notifications.PushAsync(kb.OwnerId, NotificationType.DocReady,
                "Document indexed", $"\"{document.FileName}\" finished processing ({result.Pages} pages, {result.Chunks} chunks).", ct);
        }
        catch (Exception ex) when (ex is RagException or AppException)
        {
            // Only retry genuinely transient failures (RAG service unreachable/timed out, 5xx).
            // A deterministic rejection (e.g. "scanned PDF, OCR required", 4xx) will never
            // succeed on retry, so fail it immediately instead of burning attempts + time.
            var transient = ex is RagException { StatusCode: >= 500 };

            job.ErrorMessage = ex.Message;
            job.UpdatedAt = DateTimeOffset.UtcNow;

            if (transient && job.AttemptCount < job.MaxAttempts)
            {
                job.Status = DocumentStatus.Queued;
                document.Status = DocumentStatus.Queued;
                document.UpdatedAt = DateTimeOffset.UtcNow;
                await _db.SaveChangesAsync(ct);
                return;
            }

            job.Status = DocumentStatus.Failed;
            job.CompletedAt = DateTimeOffset.UtcNow;
            document.Status = DocumentStatus.Failed;
            document.ErrorMessage = ex.Message;
            document.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);

            await _activity.LogAsync(document.UploadedBy, kb.WorkspaceId, ActivityAction.DocumentFailed, "Document", document.Id.ToString(),
                new { document.FileName, Reason = ex.Message }, ct);
            await _notifications.PushAsync(kb.OwnerId, NotificationType.DocFailed,
                "Document failed to process", $"\"{document.FileName}\": {ex.Message}", ct);
        }
    }

    private static DocumentResponse Map(Document d) => new(
        d.Id, d.KnowledgeBaseId, d.FileName, d.FileSize, d.FileType,
        d.PageCount, d.ChunkCount, d.Status.ToString(), d.ErrorMessage, d.CreatedAt, d.ProcessedAt);
}
