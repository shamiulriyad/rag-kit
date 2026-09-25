namespace Backend.Models;

/// <summary>One row per privileged admin action (or denied attempt). Append-only: nothing in the
/// app updates or deletes these. Details are short, human-readable, and must never contain
/// secrets, tokens, passwords or stack traces.</summary>
public class AdminAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ActorId { get; set; }
    public string ActorEmail { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? ResourceId { get; set; }

    /// <summary>"success" | "failed" | "denied".</summary>
    public string Result { get; set; } = "success";
    public string? Details { get; set; }
    public string? IpAddress { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
