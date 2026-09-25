namespace Backend.Models;

/// <summary>A team workspace. Knowledge Bases may optionally belong to one, enabling
/// shared/collaborative access (spec section 22, gated on the Team plan).</summary>
public class Workspace
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    /// <summary>Every user has exactly one personal workspace, created with the account. It cannot be
    /// deleted and does not need the Team plan; extra team workspaces do.</summary>
    public bool IsPersonal { get; set; }

    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
}
