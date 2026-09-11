namespace Backend.Models;

/// <summary>A developer API key. The raw key is shown exactly once at creation time
/// and never persisted - only its hash is stored (spec section 23).</summary>
public class ApiKey
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>SHA-256 of the raw key.</summary>
    public string KeyHash { get; set; } = string.Empty;

    /// <summary>First few characters of the raw key, kept for display ("rsk_live_ab12...") so
    /// a user can recognize a key in a list without it ever being retrievable in full.</summary>
    public string Prefix { get; set; } = string.Empty;

    public DateTimeOffset? LastUsedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }
}
