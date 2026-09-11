using Backend.Authorization;
using Backend.Data;
using Backend.DTOs.KnowledgeBases;
using Backend.Helpers;
using Backend.Integrations.PythonRag;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IKnowledgeBaseService
{
    Task<List<KnowledgeBaseResponse>> ListAsync(Guid userId, CancellationToken ct);
    Task<KnowledgeBaseResponse> GetAsync(Guid id, Guid userId, CancellationToken ct);
    Task<KnowledgeBaseStatsResponse> GetStatsAsync(Guid id, Guid userId, CancellationToken ct);
    Task<KnowledgeBaseResponse> CreateAsync(Guid userId, CreateKnowledgeBaseRequest request, CancellationToken ct);
    Task<KnowledgeBaseResponse> UpdateAsync(Guid id, Guid userId, UpdateKnowledgeBaseRequest request, CancellationToken ct);
    Task DeleteAsync(Guid id, Guid userId, CancellationToken ct);

    Task<List<KnowledgeBaseMemberResponse>> ListMembersAsync(Guid id, Guid userId, CancellationToken ct);
    Task<KnowledgeBaseMemberResponse> AddMemberAsync(Guid id, Guid userId, AddKnowledgeBaseMemberRequest request, CancellationToken ct);
    Task<KnowledgeBaseMemberResponse> UpdateMemberAsync(Guid id, Guid targetUserId, Guid userId, UpdateKnowledgeBaseMemberRequest request, CancellationToken ct);
    Task RemoveMemberAsync(Guid id, Guid targetUserId, Guid userId, CancellationToken ct);
}

public class KnowledgeBaseService : IKnowledgeBaseService
{
    private readonly AppDbContext _db;
    private readonly IResourceAuthorizationService _auth;
    private readonly IPlanLimitService _limits;
    private readonly IRagService _rag;
    private readonly IActivityLogService _activity;
    private readonly INotificationService _notifications;
    private readonly ILogger<KnowledgeBaseService> _log;

    public KnowledgeBaseService(
        AppDbContext db, IResourceAuthorizationService auth, IPlanLimitService limits,
        IRagService rag, IActivityLogService activity, INotificationService notifications,
        ILogger<KnowledgeBaseService> log)
    {
        _db = db;
        _auth = auth;
        _limits = limits;
        _rag = rag;
        _activity = activity;
        _notifications = notifications;
        _log = log;
    }

    public async Task<List<KnowledgeBaseResponse>> ListAsync(Guid userId, CancellationToken ct)
    {
        var owned = await _db.KnowledgeBases.Where(k => k.OwnerId == userId).ToListAsync(ct);
        var memberOf = await _db.KnowledgeBaseMembers
            .Where(m => m.UserId == userId)
            .Include(m => m.KnowledgeBase)
            .Select(m => new { KnowledgeBase = m.KnowledgeBase!, m.Role })
            .ToListAsync(ct);

        var results = owned.Select(k => Map(k, MemberRole.Owner))
            .Concat(memberOf.Where(m => m.KnowledgeBase.OwnerId != userId).Select(m => Map(m.KnowledgeBase, m.Role)))
            .OrderByDescending(k => k.UpdatedAt)
            .ToList();

        return results;
    }

    public async Task<KnowledgeBaseResponse> GetAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var kb = await _auth.GetKnowledgeBaseAsync(id, userId, ct: ct);
        return Map(kb, RoleOf(kb, userId));
    }

    public async Task<KnowledgeBaseStatsResponse> GetStatsAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var kb = await _auth.GetKnowledgeBaseAsync(id, userId, ct: ct);
        var docs = await _db.Documents.Where(d => d.KnowledgeBaseId == id).ToListAsync(ct);

        return new KnowledgeBaseStatsResponse(
            kb.Id, kb.DocumentCount, kb.ChunkCount,
            docs.Count(d => d.Status == DocumentStatus.Completed),
            docs.Count(d => d.Status is DocumentStatus.Processing or DocumentStatus.Pending or DocumentStatus.Uploading),
            docs.Count(d => d.Status == DocumentStatus.Failed),
            docs.Sum(d => d.FileSize));
    }

    public async Task<KnowledgeBaseResponse> CreateAsync(Guid userId, CreateKnowledgeBaseRequest request, CancellationToken ct)
    {
        await _limits.EnsureCanCreateKnowledgeBaseAsync(userId, ct);

        if (request.WorkspaceId is not null)
            await _auth.GetWorkspaceAsync(request.WorkspaceId.Value, userId, ct: ct);

        var kb = new KnowledgeBase
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? "",
            OwnerId = userId,
            WorkspaceId = request.WorkspaceId,
        };
        _db.KnowledgeBases.Add(kb);
        await _db.SaveChangesAsync(ct);

        await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.KnowledgeBaseCreated, "KnowledgeBase", kb.Id.ToString(),
            new { kb.Name }, ct);

        return Map(kb, MemberRole.Owner);
    }

    public async Task<KnowledgeBaseResponse> UpdateAsync(Guid id, Guid userId, UpdateKnowledgeBaseRequest request, CancellationToken ct)
    {
        var kb = await _auth.GetKnowledgeBaseAsync(id, userId, MemberRole.Admin, ct);

        if (!string.IsNullOrWhiteSpace(request.Name)) kb.Name = request.Name.Trim();
        if (request.Description is not null) kb.Description = request.Description.Trim();
        kb.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Map(kb, RoleOf(kb, userId));
    }

    public async Task DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var kb = await _auth.GetKnowledgeBaseAsync(id, userId, MemberRole.Owner, ct);

        try
        {
            await _rag.DeleteCollectionAsync(kb.QdrantCollectionName, ct);
        }
        catch (RagException ex)
        {
            // The DB record is the source of truth; a stale Qdrant collection is cleaned up
            // manually rather than blocking the user's delete on a Python outage.
            _log.LogWarning(ex, "Could not delete Qdrant collection {Collection} for KB {KbId}", kb.QdrantCollectionName, id);
        }

        _db.KnowledgeBases.Remove(kb); // cascades to Documents/Members/ChatSessions
        await _db.SaveChangesAsync(ct);

        await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.KnowledgeBaseDeleted, "KnowledgeBase", id.ToString(), ct: ct);
    }

    public async Task<List<KnowledgeBaseMemberResponse>> ListMembersAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var kb = await _auth.GetKnowledgeBaseAsync(id, userId, ct: ct);
        var members = await _db.KnowledgeBaseMembers.Where(m => m.KnowledgeBaseId == id)
            .Include(m => m.User).ToListAsync(ct);

        var owner = await _db.Users.FindAsync([kb.OwnerId], ct);
        var result = new List<KnowledgeBaseMemberResponse>();
        if (owner is not null)
            result.Add(new KnowledgeBaseMemberResponse(Guid.Empty, owner.Id, owner.Email, owner.FullName, "Owner", kb.CreatedAt));

        result.AddRange(members.Select(m => new KnowledgeBaseMemberResponse(
            m.Id, m.UserId, m.User?.Email ?? "", m.User?.FullName ?? "", m.Role.ToString(), m.CreatedAt)));

        return result;
    }

    public async Task<KnowledgeBaseMemberResponse> AddMemberAsync(Guid id, Guid userId, AddKnowledgeBaseMemberRequest request, CancellationToken ct)
    {
        var kb = await _auth.GetKnowledgeBaseAsync(id, userId, MemberRole.Admin, ct);

        if (!Enum.TryParse<MemberRole>(request.Role, true, out var role))
            throw new ValidationAppException("Role must be Owner, Admin, or Member.");

        var email = request.Email.Trim().ToLowerInvariant();
        var target = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new NotFoundException("No account exists with that email.");

        if (target.Id == kb.OwnerId)
            throw new ConflictException("This user already owns the Knowledge Base.");
        if (await _db.KnowledgeBaseMembers.AnyAsync(m => m.KnowledgeBaseId == id && m.UserId == target.Id, ct))
            throw new ConflictException("This user is already a member.");

        var member = new KnowledgeBaseMember { KnowledgeBaseId = id, UserId = target.Id, Role = role };
        _db.KnowledgeBaseMembers.Add(member);
        await _db.SaveChangesAsync(ct);

        await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.MemberInvited, "KnowledgeBase", id.ToString(),
            new { target.Email, Role = role.ToString() }, ct);
        await _notifications.PushAsync(target.Id, NotificationType.TeamActivity,
            "Added to a Knowledge Base", $"You were added to \"{kb.Name}\" as {role}.", ct);

        return new KnowledgeBaseMemberResponse(member.Id, target.Id, target.Email, target.FullName, role.ToString(), member.CreatedAt);
    }

    public async Task<KnowledgeBaseMemberResponse> UpdateMemberAsync(Guid id, Guid targetUserId, Guid userId, UpdateKnowledgeBaseMemberRequest request, CancellationToken ct)
    {
        await _auth.GetKnowledgeBaseAsync(id, userId, MemberRole.Admin, ct);

        if (!Enum.TryParse<MemberRole>(request.Role, true, out var role))
            throw new ValidationAppException("Role must be Owner, Admin, or Member.");

        var member = await _db.KnowledgeBaseMembers.Include(m => m.User)
            .FirstOrDefaultAsync(m => m.KnowledgeBaseId == id && m.UserId == targetUserId, ct)
            ?? throw new NotFoundException("Member not found.");

        member.Role = role;
        await _db.SaveChangesAsync(ct);

        return new KnowledgeBaseMemberResponse(member.Id, member.UserId, member.User?.Email ?? "", member.User?.FullName ?? "", role.ToString(), member.CreatedAt);
    }

    public async Task RemoveMemberAsync(Guid id, Guid targetUserId, Guid userId, CancellationToken ct)
    {
        await _auth.GetKnowledgeBaseAsync(id, userId, MemberRole.Admin, ct);

        var member = await _db.KnowledgeBaseMembers
            .FirstOrDefaultAsync(m => m.KnowledgeBaseId == id && m.UserId == targetUserId, ct)
            ?? throw new NotFoundException("Member not found.");

        _db.KnowledgeBaseMembers.Remove(member);
        await _db.SaveChangesAsync(ct);
    }

    private static MemberRole RoleOf(KnowledgeBase kb, Guid userId) =>
        kb.OwnerId == userId ? MemberRole.Owner : kb.Members.FirstOrDefault(m => m.UserId == userId)?.Role ?? MemberRole.Member;

    private static KnowledgeBaseResponse Map(KnowledgeBase kb, MemberRole role) => new(
        kb.Id, kb.Name, kb.Description, kb.DocumentCount, kb.ChunkCount, kb.CreatedAt, kb.UpdatedAt, role.ToString());
}
