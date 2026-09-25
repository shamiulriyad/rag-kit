namespace Backend.Models;

/// <summary>Something the platform observed that an operator may need to look at: a failed
/// sign-in, a sign-in to a suspended account, or a request blocked by the rate limiter.
/// Append-only. Never stores passwords, tokens or request bodies.</summary>
public class SecurityEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>login_failed | login_suspended | rate_limited.</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>The email typed into the form (unverified, so it may not belong to any account).</summary>
    public string? Email { get; set; }
    public string? IpAddress { get; set; }
    public string? Path { get; set; }
    public string? Details { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
