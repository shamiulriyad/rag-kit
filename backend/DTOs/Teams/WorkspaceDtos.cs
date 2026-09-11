using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Teams;

public record WorkspaceResponse(Guid Id, string Name, Guid OwnerId, int MemberCount, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public record CreateWorkspaceRequest([Required, MinLength(2), MaxLength(200)] string Name);

public record UpdateWorkspaceRequest([MinLength(2), MaxLength(200)] string? Name);

/// <summary>Shaped to match frontend/src/pages/TeamPage.tsx's <c>TeamMember</c>
/// (id, name, email, role, status, joinedAt).</summary>
public record WorkspaceMemberResponse(
    Guid Id, string Name, string Email, string Role, string Status, DateTimeOffset CreatedAt);

public record InviteWorkspaceMemberRequest(
    [Required, EmailAddress] string Email,
    [Required] string Role);

public record UpdateWorkspaceMemberRoleRequest([Required] string Role);
