using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Authorization;

/// <summary>Every "does this user own/have permission for X" check lives here, so
/// controllers/services never hand-roll ownership logic (spec: "users must only access
/// resources they own or have permission to access").</summary>
public interface IResourceAuthorizationService
{
    /// <summary>Loads a Knowledge Base the user owns or is a member of, or throws 404
    /// (never 403 - a KB you can't see should not be distinguishable from one that
    /// doesn't exist). When <paramref name="minRole"/> is set, Member-only callers are
    /// rejected with 403 for write operations.</summary>
    Task<KnowledgeBase> GetKnowledgeBaseAsync(Guid knowledgeBaseId, Guid userId, MemberRole? minRole = null, CancellationToken ct = default);

    Task<Document> GetDocumentAsync(Guid documentId, Guid userId, CancellationToken ct = default);

    Task<Workspace> GetWorkspaceAsync(Guid workspaceId, Guid userId, MemberRole? minRole = null, CancellationToken ct = default);
}

public class ResourceAuthorizationService : IResourceAuthorizationService
{
    private readonly AppDbContext _db;

    public ResourceAuthorizationService(AppDbContext db) => _db = db;

    public async Task<KnowledgeBase> GetKnowledgeBaseAsync(Guid knowledgeBaseId, Guid userId, MemberRole? minRole = null, CancellationToken ct = default)
    {
        var kb = await _db.KnowledgeBases
            .Include(k => k.Members)
            .FirstOrDefaultAsync(k => k.Id == knowledgeBaseId, ct)
            ?? throw new NotFoundException("Knowledge Base not found.");

        var role = RoleOf(kb, userId) ?? throw new NotFoundException("Knowledge Base not found.");
        if (minRole is not null && !Satisfies(role, minRole.Value))
            throw new ForbiddenException("You need Admin or Owner access to do this.");

        return kb;
    }

    public async Task<Document> GetDocumentAsync(Guid documentId, Guid userId, CancellationToken ct = default)
    {
        var document = await _db.Documents.Include(d => d.KnowledgeBase!.Members)
            .FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new NotFoundException("Document not found.");

        if (document.KnowledgeBase is null || RoleOf(document.KnowledgeBase, userId) is null)
            throw new NotFoundException("Document not found.");

        return document;
    }

    public async Task<Workspace> GetWorkspaceAsync(Guid workspaceId, Guid userId, MemberRole? minRole = null, CancellationToken ct = default)
    {
        var workspace = await _db.Workspaces.Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == workspaceId, ct)
            ?? throw new NotFoundException("Workspace not found.");

        MemberRole? role = workspace.OwnerId == userId
            ? MemberRole.Owner
            : workspace.Members.FirstOrDefault(m => m.UserId == userId)?.Role;

        if (role is null) throw new NotFoundException("Workspace not found.");
        if (minRole is not null && !Satisfies(role.Value, minRole.Value))
            throw new ForbiddenException("You need Admin or Owner access to do this.");

        return workspace;
    }

    private static MemberRole? RoleOf(KnowledgeBase kb, Guid userId) =>
        kb.OwnerId == userId ? MemberRole.Owner : kb.Members.FirstOrDefault(m => m.UserId == userId)?.Role;

    private static bool Satisfies(MemberRole held, MemberRole required) => Rank(held) >= Rank(required);

    private static int Rank(MemberRole role) => role switch
    {
        MemberRole.Owner => 3,
        MemberRole.Admin => 2,
        _ => 1,
    };
}
