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
}

/// <summary>Owns the upload -> store -> ingest -> update-status flow (spec section 10).
/// No PDF extraction/chunking/embedding logic here - that's Python's job; this service
/// only orchestrates storage + the RAG service call.</summary>
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

        var storagePath = $"documents/{kb.OwnerId}/{knowledgeBaseId}/{document.Id}.pdf";

        try
        {
            await using (var uploadStream = file.OpenReadStream())
                await _storage.UploadAsync(storagePath, uploadStream, "application/pdf", ct);

            document.StoragePath = storagePath;
            document.Status = DocumentStatus.Processing;
            await _db.SaveChangesAsync(ct);

            var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == kb.OwnerId, ct);

            RagIngestResult result;
            await using (var ingestStream = file.OpenReadStream())
            {
                result = await _rag.IngestAsync(
                    kb.QdrantCollectionName, document.Id, ingestStream, document.FileName,
                    settings?.ChunkSize ?? 1000, settings?.ChunkOverlap ?? 150, ct);
            }

            document.Status = DocumentStatus.Completed;
            document.PageCount = result.Pages;
            document.ChunkCount = result.Chunks;
            document.ProcessedAt = DateTimeOffset.UtcNow;
            document.UpdatedAt = DateTimeOffset.UtcNow;

            kb.DocumentCount++;
            kb.ChunkCount += result.Chunks;
            kb.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync(ct);

            await _limits.RecordDocumentUploadedAsync(kb.OwnerId, file.Length, ct);
            await _limits.RecordDocumentChunkedAsync(kb.OwnerId, result.Chunks, ct);
            await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentUploaded, "Document", document.Id.ToString(),
                new { document.FileName, kb.Id }, ct);
            await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentProcessed, "Document", document.Id.ToString(), ct: ct);
            await _notifications.PushAsync(kb.OwnerId, NotificationType.DocReady,
                "Document indexed", $"\"{document.FileName}\" finished processing ({result.Pages} pages, {result.Chunks} chunks).", ct);

            return Map(document);
        }
        catch (Exception ex) when (ex is RagException or AppException)
        {
            document.Status = DocumentStatus.Failed;
            document.ErrorMessage = ex.Message;
            document.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);

            await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentFailed, "Document", document.Id.ToString(),
                new { document.FileName, Reason = ex.Message }, ct);
            await _notifications.PushAsync(kb.OwnerId, NotificationType.DocFailed,
                "Document failed to process", $"\"{document.FileName}\": {ex.Message}", ct);

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
        var kb = doc.KnowledgeBase!;

        if (string.IsNullOrEmpty(doc.StoragePath))
            throw new ValidationAppException("This document has no stored file to reprocess.");

        doc.Status = DocumentStatus.Processing;
        doc.ErrorMessage = null;
        await _db.SaveChangesAsync(ct);

        try
        {
            await _rag.DeleteDocumentAsync(kb.QdrantCollectionName, doc.Id, ct); // drop stale chunks first
            var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == kb.OwnerId, ct);

            await using var pdf = await _storage.DownloadAsync(doc.StoragePath, ct);
            var result = await _rag.IngestAsync(
                kb.QdrantCollectionName, doc.Id, pdf, doc.FileName,
                settings?.ChunkSize ?? 1000, settings?.ChunkOverlap ?? 150, ct);

            kb.ChunkCount = kb.ChunkCount - (doc.ChunkCount ?? 0) + result.Chunks;
            doc.ChunkCount = result.Chunks;
            doc.PageCount = result.Pages;
            doc.Status = DocumentStatus.Completed;
            doc.ProcessedAt = DateTimeOffset.UtcNow;
            doc.UpdatedAt = DateTimeOffset.UtcNow;
            kb.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);

            await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentProcessed, "Document", doc.Id.ToString(), ct: ct);
            return Map(doc);
        }
        catch (Exception ex) when (ex is RagException or AppException)
        {
            doc.Status = DocumentStatus.Failed;
            doc.ErrorMessage = ex.Message;
            doc.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.DocumentFailed, "Document", doc.Id.ToString(), ct: ct);
            throw;
        }
    }

    private static DocumentResponse Map(Document d) => new(
        d.Id, d.KnowledgeBaseId, d.FileName, d.FileSize, d.FileType,
        d.PageCount, d.ChunkCount, d.Status.ToString(), d.ErrorMessage, d.CreatedAt, d.ProcessedAt);
}
