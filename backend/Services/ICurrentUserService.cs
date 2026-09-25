using System.Security.Claims;

namespace Backend.Services;

/// <summary>Reads the authenticated user's id/role from JWT claims - the only place
/// that's allowed to trust "who is calling," per the spec's "never trust a user id
/// coming from the frontend" rule.</summary>
public interface ICurrentUserService
{
    Guid UserId { get; }
    string Email { get; }
    string Role { get; }
}

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUserService(IHttpContextAccessor accessor) => _accessor = accessor;

    private ClaimsPrincipal User => _accessor.HttpContext?.User
        ?? throw new InvalidOperationException("No HttpContext available.");

    public Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("Missing user id claim."));

    // The JWT handler maps the inbound "email" claim to ClaimTypes.Email, so check both.
    public string Email => User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)
        ?? User.FindFirstValue(ClaimTypes.Email) ?? "";

    public string Role => User.FindFirstValue(ClaimTypes.Role) ?? "Member";
}
