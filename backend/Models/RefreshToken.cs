namespace Backend.Models;

/// <summary>An issued refresh token, stored hashed. Backs <c>POST /api/auth/refresh</c>
/// and lets <c>POST /api/auth/logout</c> revoke a session server-side.</summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>SHA-256 of the raw token. The raw value is only ever returned to the client once.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTimeOffset.UtcNow;
}
