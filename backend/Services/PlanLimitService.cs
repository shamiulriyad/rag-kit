using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public record UsageSummary(
    string PlanCode,
    int Documents, int MaxDocuments,
    long StorageBytes, long MaxStorageBytes,
    int Chunks, int MaxChunks,
    int QuestionsThisMonth, int MaxQuestionsPerMonth,
    int KnowledgeBases, int MaxKnowledgeBases);

/// <summary>Enforces the Free/Pro/Team limits (spec section 5) before any expensive
/// operation, and tracks monthly usage (spec section 17). Plan caps ("3 PDFs", "500MB")
/// are checked against live totals; <see cref="UsageRecord"/> tracks monthly activity
/// (questions/month is the one limit that actually resets each month).</summary>
public interface IPlanLimitService
{
    Task<UsageSummary> GetUsageSummaryAsync(Guid userId, CancellationToken ct);
    Task EnsureCanCreateKnowledgeBaseAsync(Guid userId, CancellationToken ct);
    Task EnsureCanUploadDocumentAsync(Guid userId, long fileSize, CancellationToken ct);
    Task EnsureCanAskQuestionAsync(Guid userId, CancellationToken ct);
    Task RecordQuestionAskedAsync(Guid userId, CancellationToken ct);
    Task RecordDocumentUploadedAsync(Guid userId, long fileSize, CancellationToken ct);
    Task RecordDocumentChunkedAsync(Guid userId, int chunkCount, CancellationToken ct);
}

public class PlanLimitService : IPlanLimitService
{
    private readonly AppDbContext _db;

    public PlanLimitService(AppDbContext db) => _db = db;

    public async Task<UsageSummary> GetUsageSummaryAsync(Guid userId, CancellationToken ct)
    {
        var plan = await GetPlanAsync(userId, ct);
        var (documents, storageBytes, chunks, knowledgeBases) = await LiveTotalsAsync(userId, ct);
        var usage = await GetOrCreateCurrentMonthAsync(userId, ct);

        return new UsageSummary(
            plan.Code.ToString(),
            documents, plan.MaxDocuments,
            storageBytes, plan.MaxStorageBytes,
            chunks, plan.MaxChunks,
            usage.QuestionsUsed, plan.MaxQuestionsPerMonth,
            knowledgeBases, plan.MaxKnowledgeBases);
    }

    public async Task EnsureCanCreateKnowledgeBaseAsync(Guid userId, CancellationToken ct)
    {
        var plan = await GetPlanAsync(userId, ct);
        var count = await _db.KnowledgeBases.CountAsync(k => k.OwnerId == userId, ct);
        if (count >= plan.MaxKnowledgeBases)
            throw new PlanLimitExceededException(
                $"Your {plan.Name} plan allows up to {plan.MaxKnowledgeBases} Knowledge Base(s). Upgrade to create more.");
    }

    public async Task EnsureCanUploadDocumentAsync(Guid userId, long fileSize, CancellationToken ct)
    {
        var plan = await GetPlanAsync(userId, ct);
        var (documents, storageBytes, _, _) = await LiveTotalsAsync(userId, ct);

        if (documents >= plan.MaxDocuments)
            throw new PlanLimitExceededException(
                $"Your {plan.Name} plan allows up to {plan.MaxDocuments} documents. Upgrade to upload more.");

        if (storageBytes + fileSize > plan.MaxStorageBytes)
            throw new PlanLimitExceededException(
                $"This upload would exceed your {plan.Name} plan's {plan.MaxStorageBytes / (1024 * 1024)} MB storage limit.");
    }

    public async Task EnsureCanAskQuestionAsync(Guid userId, CancellationToken ct)
    {
        var plan = await GetPlanAsync(userId, ct);
        var usage = await GetOrCreateCurrentMonthAsync(userId, ct);
        if (usage.QuestionsUsed >= plan.MaxQuestionsPerMonth)
            throw new PlanLimitExceededException(
                $"You have used all {plan.MaxQuestionsPerMonth} questions included in your {plan.Name} plan this month.");
    }

    public async Task RecordQuestionAskedAsync(Guid userId, CancellationToken ct)
    {
        var usage = await GetOrCreateCurrentMonthAsync(userId, ct);
        usage.QuestionsUsed++;
        usage.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RecordDocumentUploadedAsync(Guid userId, long fileSize, CancellationToken ct)
    {
        var usage = await GetOrCreateCurrentMonthAsync(userId, ct);
        usage.DocumentsUsed++;
        usage.StorageUsedBytes += fileSize;
        usage.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RecordDocumentChunkedAsync(Guid userId, int chunkCount, CancellationToken ct)
    {
        var usage = await GetOrCreateCurrentMonthAsync(userId, ct);
        usage.ChunksUsed += chunkCount;
        usage.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<Plan> GetPlanAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.Plan).FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");
        return user.Plan ?? await _db.Plans.FirstAsync(p => p.Code == Models.PlanId.Free, ct);
    }

    private async Task<(int documents, long storageBytes, int chunks, int knowledgeBases)> LiveTotalsAsync(Guid userId, CancellationToken ct)
    {
        var kbIds = await _db.KnowledgeBases.Where(k => k.OwnerId == userId).Select(k => k.Id).ToListAsync(ct);
        var docs = await _db.Documents.Where(d => kbIds.Contains(d.KnowledgeBaseId)).ToListAsync(ct);

        return (docs.Count, docs.Sum(d => d.FileSize), docs.Sum(d => d.ChunkCount ?? 0), kbIds.Count);
    }

    private async Task<UsageRecord> GetOrCreateCurrentMonthAsync(Guid userId, CancellationToken ct)
    {
        var month = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var record = await _db.UsageRecords.FirstOrDefaultAsync(u => u.UserId == userId && u.Month == month, ct);
        if (record is not null) return record;

        record = new UsageRecord { UserId = userId, Month = month };
        _db.UsageRecords.Add(record);
        await _db.SaveChangesAsync(ct);
        return record;
    }
}
