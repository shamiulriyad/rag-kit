namespace Backend.Models;

/// <summary>A single-use, expiring token emailed to a user to prove they own the address:
/// password reset or email verification. Only the SHA-256 hash is stored, so a database leak
/// does not expose usable links.</summary>
public class UserToken
{
    public const string PasswordReset = "password_reset";
    public const string EmailVerify = "email_verify";

    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary><see cref="PasswordReset"/> or <see cref="EmailVerify"/>.</summary>
    public string Purpose { get; set; } = string.Empty;

    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UsedAt { get; set; }

    public bool IsUsable => UsedAt is null && ExpiresAt > DateTimeOffset.UtcNow;
}
