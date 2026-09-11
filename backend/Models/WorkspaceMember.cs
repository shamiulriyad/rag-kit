namespace Backend.Models;

/// <summary>A workspace member, or a pending invitation. <see cref="UserId"/> is null until
/// someone with a matching email registers (spec: "invitation emails can be mocked, keep
/// the architecture ready for real email invitations later").</summary>
public class WorkspaceMember
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    public Guid? UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Set for a pending invite of someone not yet registered; otherwise mirrors User.Email.</summary>
    public string InviteEmail { get; set; } = string.Empty;

    public MemberRole Role { get; set; } = MemberRole.Member;

    /// <summary>"active" once UserId is linked, "pending" until then.</summary>
    public string Status { get; set; } = "pending";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
