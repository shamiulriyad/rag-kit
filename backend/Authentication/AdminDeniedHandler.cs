using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace Backend.Authentication;

/// <summary>Records a security event when a signed-in, non-admin user calls an admin endpoint, then
/// lets the default handler produce the normal 403. Anonymous callers (401) are not recorded, since
/// they are indistinguishable from any unauthenticated traffic.</summary>
public class AdminDeniedHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();
    private readonly ISecurityEventService _events;

    public AdminDeniedHandler(ISecurityEventService events) => _events = events;

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult result)
    {
        if (result.Forbidden && context.User.Identity?.IsAuthenticated == true
            && context.Request.Path.StartsWithSegments("/api/admin"))
        {
            var email = context.User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value
                ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            await _events.RecordAsync("admin_denied", email, context.Request.Path.Value,
                $"{context.Request.Method} refused: not a platform admin");
        }
        await _default.HandleAsync(next, context, policy, result);
    }
}
