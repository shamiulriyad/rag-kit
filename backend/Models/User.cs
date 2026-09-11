namespace Backend.Models;

/// <summary>An account. Auth (password hash, JWT) lives here too - this project
/// does not use Supabase Auth or ASP.NET Identity, per the spec's own auth
/// section (register/login/refresh implemented directly).</summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }

    /// <summary>Coarse global role. Fine-grained access is per Workspace/Knowledge Base membership.</summary>
    public MemberRole Role { get; set; } = MemberRole.Member;

    public Guid? PlanId { get; set; }
    public Plan? Plan { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
