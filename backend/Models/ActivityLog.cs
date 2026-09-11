namespace Backend.Models;

/// <summary>An immutable audit trail entry. <see cref="Action"/> is one of the
/// <see cref="ActivityAction"/> constants.</summary>
public class ActivityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid? WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }

    /// <summary>Free-form JSON payload (stored as jsonb) - e.g. { "fileName": "..." }.</summary>
    public string? MetadataJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
