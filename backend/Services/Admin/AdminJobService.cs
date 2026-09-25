using Backend.Data;
using Backend.DTOs.Admin;
using Backend.DTOs.Common;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Admin;

public interface IAdminJobService
{
    Task<PagedResult<AdminJobItem>> ListAsync(string? status, string? search, int page, int pageSize, CancellationToken ct);
    Task<AdminJobDetail> GetAsync(Guid id, CancellationToken ct);
    Task RetryAsync(Guid id, CancellationToken ct);
    Task ReprocessDocumentAsync(Guid documentId, CancellationToken ct);
}

/// <summary>Everything shown here is the job row itself. The worker records status, attempt
/// count, timestamps and the last error - nothing finer - so progress is derived from those and
/// there is no percentage, per-stage timing or log stream to show.</summary>
public class AdminJobService : IAdminJobService
{
    // The worker has no separate "retry pending" state: a job that was claimed at least once and
    // is Queued again is waiting for its next attempt.
    private static string DisplayStatus(DocumentStatus s, int attempts) =>
        s == DocumentStatus.Queued && attempts > 0 ? "RetryPending" : s.ToString();

    private readonly AppDbContext _db;
    private readonly IAdminAuditService _audit;

    public AdminJobService(AppDbContext db, IAdminAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private record Row(
        Guid Id, Guid DocumentId, string FileName, string Workspace, DocumentStatus Status, int Attempts, int MaxAttempts,
        string? Error, DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt, DateTimeOffset UpdatedAt);

    private static AdminJobItem Map(Row r)
    {
        double? duration = r.StartedAt is null ? null
            : ((r.CompletedAt ?? (r.Status == DocumentStatus.Processing ? DateTimeOffset.UtcNow : r.UpdatedAt)) - r.StartedAt.Value).TotalSeconds;
        return new AdminJobItem(r.Id, r.DocumentId, r.FileName, r.Workspace, DisplayStatus(r.Status, r.Attempts),
            r.Attempts, r.MaxAttempts, duration, AdminText.Sanitize(r.Error), r.CreatedAt, r.StartedAt, r.CompletedAt);
    }

    private IQueryable<Row> Rows(IQueryable<DocumentProcessingJob> q) =>
        q.Select(j => new Row(
            j.Id, j.DocumentId, j.Document != null ? j.Document.FileName : "(deleted)",
            j.Document != null && j.Document.KnowledgeBase != null
                ? (j.Document.KnowledgeBase.Workspace != null ? j.Document.KnowledgeBase.Workspace.Name : j.Document.KnowledgeBase.Name)
                : "",
            j.Status, j.AttemptCount, j.MaxAttempts, j.ErrorMessage, j.CreatedAt, j.StartedAt, j.CompletedAt, j.UpdatedAt));

    public async Task<PagedResult<AdminJobItem>> ListAsync(string? status, string? search, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.DocumentProcessingJobs.AsQueryable();
        switch (status)
        {
            case "RetryPending": q = q.Where(j => j.Status == DocumentStatus.Queued && j.AttemptCount > 0); break;
            case "Queued": q = q.Where(j => j.Status == DocumentStatus.Queued && j.AttemptCount == 0); break;
            case "Processing": q = q.Where(j => j.Status == DocumentStatus.Processing); break;
            case "Completed": q = q.Where(j => j.Status == DocumentStatus.Completed); break;
            case "Failed": q = q.Where(j => j.Status == DocumentStatus.Failed); break;
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(j => (j.Document != null && j.Document.FileName.ToLower().Contains(s)) || j.Id.ToString().StartsWith(s));
        }

        var total = await q.CountAsync(ct);
        var rows = await Rows(q.OrderByDescending(j => j.CreatedAt)).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<AdminJobItem> { Items = rows.Select(Map).ToList(), Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<AdminJobDetail> GetAsync(Guid id, CancellationToken ct)
    {
        var row = await Rows(_db.DocumentProcessingJobs.Where(j => j.Id == id)).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Job not found.");
        var job = Map(row);

        var doc = await _db.Documents.Where(d => d.Id == row.DocumentId)
            .Select(d => new
            {
                d.Status, KbId = d.KnowledgeBaseId, Kb = d.KnowledgeBase != null ? d.KnowledgeBase.Name : "",
                Owner = d.UploadedByUser != null ? d.UploadedByUser.Email : "",
            }).FirstOrDefaultAsync(ct);

        var s = row.Status;
        var stages = new List<JobStage>
        {
            new("Queued", "done", row.CreatedAt),
            new("Processing", s == DocumentStatus.Processing ? "active" : row.StartedAt is null ? "pending" : "done", row.StartedAt),
            s switch
            {
                DocumentStatus.Completed => new JobStage("Completed", "done", row.CompletedAt),
                DocumentStatus.Failed => new JobStage("Failed", "failed", row.CompletedAt ?? row.UpdatedAt),
                _ => new JobStage("Completed", "pending", null),
            },
        };

        var log = new List<JobLogEntry> { new(row.CreatedAt, "Job queued.") };
        if (row.StartedAt is { } started)
            log.Add(new(started, $"Worker started processing (attempt {row.Attempts} of {row.MaxAttempts})."));
        if (row.Status == DocumentStatus.Queued && row.Attempts > 0)
            log.Add(new(row.UpdatedAt, "Attempt did not succeed; job is queued for another attempt."));
        if (row.Status == DocumentStatus.Completed && row.CompletedAt is { } done)
            log.Add(new(done, "Document indexed."));
        if (row.Status == DocumentStatus.Failed)
            log.Add(new(row.CompletedAt ?? row.UpdatedAt, "Job failed: " + (AdminText.Sanitize(row.Error) ?? "no error recorded") + "."));

        return new AdminJobDetail(job, doc?.KbId ?? Guid.Empty, doc?.Kb ?? "", doc?.Owner ?? "",
            doc?.Status.ToString() ?? "", stages, log);
    }

    public async Task RetryAsync(Guid id, CancellationToken ct)
    {
        var job = await _db.DocumentProcessingJobs.FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new NotFoundException("Job not found.");
        if (job.Status != DocumentStatus.Failed)
            throw new ConflictException("Only failed jobs can be retried.");

        await EnqueueAsync(job.DocumentId, "job.retry", "Job", id.ToString(), ct);
    }

    public Task ReprocessDocumentAsync(Guid documentId, CancellationToken ct) =>
        EnqueueAsync(documentId, "document.reprocess", "Document", documentId.ToString(), ct);

    private async Task EnqueueAsync(Guid documentId, string action, string resourceType, string resourceId, CancellationToken ct)
    {
        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new NotFoundException("The document for this job no longer exists.");
        if (string.IsNullOrEmpty(doc.StoragePath))
            throw new ValidationAppException("This document has no stored file to reprocess.");

        var active = await _db.DocumentProcessingJobs.AnyAsync(j =>
            j.DocumentId == documentId && (j.Status == DocumentStatus.Queued || j.Status == DocumentStatus.Processing), ct);
        if (active) throw new ConflictException("This document already has a job queued or running.");

        doc.Status = DocumentStatus.Queued;
        doc.ErrorMessage = null;
        doc.UpdatedAt = DateTimeOffset.UtcNow;
        _db.DocumentProcessingJobs.Add(new DocumentProcessingJob { DocumentId = doc.Id, KnowledgeBaseId = doc.KnowledgeBaseId });
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(action, resourceType, resourceId, "success", doc.FileName, ct);
    }
}
