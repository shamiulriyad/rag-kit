using Backend.Authorization;
using Backend.Data;
using Backend.DTOs.Teams;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IWorkspaceService
{
    Task<List<WorkspaceResponse>> ListAsync(Guid userId, CancellationToken ct);
    Task<WorkspaceResponse> GetAsync(Guid id, Guid userId, CancellationToken ct);
    Task<WorkspaceResponse> CreateAsync(Guid userId, CreateWorkspaceRequest request, CancellationToken ct);
    Task<WorkspaceResponse> UpdateAsync(Guid id, Guid userId, UpdateWorkspaceRequest request, CancellationToken ct);
    Task DeleteAsync(Guid id, Guid userId, CancellationToken ct);

    Task<List<WorkspaceMemberResponse>> ListMembersAsync(Guid id, Guid userId, CancellationToken ct);
    Task<WorkspaceMemberResponse> InviteAsync(Guid id, Guid userId, InviteWorkspaceMemberRequest request, CancellationToken ct);
    Task<WorkspaceMemberResponse> UpdateMemberRoleAsync(Guid id, Guid memberOrUserId, Guid userId, UpdateWorkspaceMemberRoleRequest request, CancellationToken ct);
    Task RemoveMemberAsync(Guid id, Guid memberOrUserId, Guid userId, CancellationToken ct);
}

/// <summary>Workspaces (spec section 22). Everyone has a personal one; creating additional team
/// workspaces requires the Team plan.
/// Invitations are mocked - no email is sent, a pending member row is created directly,
/// and it activates the moment someone registers with a matching email.</summary>
public class WorkspaceService : IWorkspaceService
{
    private readonly AppDbContext _db;
    private readonly IResourceAuthorizationService _auth;
    private readonly IActivityLogService _activity;

    public WorkspaceService(AppDbContext db, IResourceAuthorizationService auth, IActivityLogService activity)
    {
        _db = db;
        _auth = auth;
        _activity = activity;
    }

    /// <summary>Makes sure the user has a personal workspace (older accounts predate them) and that
    /// their knowledge bases belong to a workspace. Safe to call repeatedly.</summary>
    private async Task EnsurePersonalAsync(Guid userId, CancellationToken ct)
    {
        var personal = await _db.Workspaces.FirstOrDefaultAsync(w => w.OwnerId == userId && w.IsPersonal, ct);
        if (personal is null)
        {
            personal = new Workspace { Name = "Personal", OwnerId = userId, IsPersonal = true };
            _db.Workspaces.Add(personal);
            await _db.SaveChangesAsync(ct);
        }
        var loose = await _db.KnowledgeBases.Where(k => k.OwnerId == userId && k.WorkspaceId == null).ToListAsync(ct);
        if (loose.Count > 0)
        {
            foreach (var kb in loose) kb.WorkspaceId = personal.Id;
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<List<WorkspaceResponse>> ListAsync(Guid userId, CancellationToken ct)
    {
        await EnsurePersonalAsync(userId, ct);
        var workspaces = await _db.Workspaces
            .Where(w => w.OwnerId == userId || w.Members.Any(m => m.UserId == userId))
            .Include(w => w.Members)
            .ToListAsync(ct);
        return workspaces.Select(Map).ToList();
    }

    public async Task<WorkspaceResponse> GetAsync(Guid id, Guid userId, CancellationToken ct) =>
        Map(await _auth.GetWorkspaceAsync(id, userId, ct: ct));

    public async Task<WorkspaceResponse> CreateAsync(Guid userId, CreateWorkspaceRequest request, CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.Plan).FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");
        if (user.Plan is null || !user.Plan.TeamWorkspaceEnabled)
            throw new PlanLimitExceededException("Team workspaces require the Team plan. Upgrade to create one.");

        var workspace = new Workspace { Name = request.Name.Trim(), OwnerId = userId };
        _db.Workspaces.Add(workspace);
        await _db.SaveChangesAsync(ct);
        return Map(workspace);
    }

    public async Task<WorkspaceResponse> UpdateAsync(Guid id, Guid userId, UpdateWorkspaceRequest request, CancellationToken ct)
    {
        var workspace = await _auth.GetWorkspaceAsync(id, userId, MemberRole.Admin, ct);
        if (!string.IsNullOrWhiteSpace(request.Name)) workspace.Name = request.Name.Trim();
        workspace.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Map(workspace);
    }

    public async Task DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var workspace = await _auth.GetWorkspaceAsync(id, userId, MemberRole.Owner, ct);
        if (workspace.IsPersonal) throw new ValidationAppException("Your personal workspace cannot be deleted.");
        _db.Workspaces.Remove(workspace);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<WorkspaceMemberResponse>> ListMembersAsync(Guid id, Guid userId, CancellationToken ct)
    {
        await _auth.GetWorkspaceAsync(id, userId, ct: ct);
        var members = await _db.WorkspaceMembers.Where(m => m.WorkspaceId == id).Include(m => m.User).ToListAsync(ct);
        return members.Select(m => new WorkspaceMemberResponse(
            m.Id, m.User?.FullName ?? m.InviteEmail, m.User?.Email ?? m.InviteEmail, m.Role.ToString(), m.Status, m.CreatedAt)).ToList();
    }

    public async Task<WorkspaceMemberResponse> InviteAsync(Guid id, Guid userId, InviteWorkspaceMemberRequest request, CancellationToken ct)
    {
        var workspace = await _auth.GetWorkspaceAsync(id, userId, MemberRole.Admin, ct);

        // Team features are paid for by the workspace owner's plan, whoever is doing the inviting.
        if (workspace.IsPersonal)
            throw new ValidationAppException("A personal workspace cannot have members. Create a team workspace to invite people.");
        var ownerPlan = await _db.Users.Where(u => u.Id == workspace.OwnerId).Select(u => u.Plan).FirstOrDefaultAsync(ct);
        if (ownerPlan is null || !ownerPlan.TeamWorkspaceEnabled)
            throw new PlanLimitExceededException("Inviting team members requires the Team plan. Upgrade to invite people.");

        if (!Enum.TryParse<MemberRole>(request.Role, true, out var role))
            throw new ValidationAppException("Role must be Owner, Admin, or Member.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == id && m.InviteEmail == email, ct))
            throw new ConflictException("This person has already been invited.");

        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        var member = new WorkspaceMember
        {
            WorkspaceId = id,
            UserId = existingUser?.Id,
            InviteEmail = email,
            Role = role,
            Status = existingUser is null ? "pending" : "active",
        };
        _db.WorkspaceMembers.Add(member);
        await _db.SaveChangesAsync(ct);

        await _activity.LogAsync(userId, id, ActivityAction.MemberInvited, "Workspace", id.ToString(), new { email, role = role.ToString() }, ct);

        return new WorkspaceMemberResponse(
            member.Id, existingUser?.FullName ?? email, email, role.ToString(), member.Status, member.CreatedAt);
    }

    public async Task<WorkspaceMemberResponse> UpdateMemberRoleAsync(Guid id, Guid memberOrUserId, Guid userId, UpdateWorkspaceMemberRoleRequest request, CancellationToken ct)
    {
        await _auth.GetWorkspaceAsync(id, userId, MemberRole.Admin, ct);

        if (!Enum.TryParse<MemberRole>(request.Role, true, out var role))
            throw new ValidationAppException("Role must be Owner, Admin, or Member.");

        // Accepts either the WorkspaceMember row id or the member's User id (the spec's
        // route uses {userId}, but a pending invite has no user yet).
        var member = await _db.WorkspaceMembers.Include(m => m.User).FirstOrDefaultAsync(
            m => m.WorkspaceId == id && (m.Id == memberOrUserId || m.UserId == memberOrUserId), ct)
            ?? throw new NotFoundException("Member not found.");

        member.Role = role;
        await _db.SaveChangesAsync(ct);

        return new WorkspaceMemberResponse(
            member.Id, member.User?.FullName ?? member.InviteEmail, member.User?.Email ?? member.InviteEmail,
            role.ToString(), member.Status, member.CreatedAt);
    }

    public async Task RemoveMemberAsync(Guid id, Guid memberOrUserId, Guid userId, CancellationToken ct)
    {
        var workspace = await _auth.GetWorkspaceAsync(id, userId, MemberRole.Admin, ct);
        // Accepts either the WorkspaceMember row id or the member's User id (the spec's
        // route uses {userId}, but a pending invite has no user yet).
        var member = await _db.WorkspaceMembers.Include(m => m.User).FirstOrDefaultAsync(
            m => m.WorkspaceId == id && (m.Id == memberOrUserId || m.UserId == memberOrUserId), ct)
            ?? throw new NotFoundException("Member not found.");
        _db.WorkspaceMembers.Remove(member);
        await _db.SaveChangesAsync(ct);

        await _activity.LogAsync(userId, workspace.Id, ActivityAction.MemberRemoved, "Workspace", id.ToString(),
            new { Email = member.User?.Email ?? member.InviteEmail }, ct);
    }

    private static WorkspaceResponse Map(Workspace w) =>
        new(w.Id, w.Name, w.OwnerId, w.Members.Count + 1 /* +owner */, w.CreatedAt, w.UpdatedAt, w.IsPersonal);
}
