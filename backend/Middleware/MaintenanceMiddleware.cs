using Backend.Authentication;
using Backend.DTOs.Common;
using Backend.Services;

namespace Backend.Middleware;

/// <summary>While maintenance mode is on, customer API requests get 503 with the operator's message.
/// Always let through: sign-in (so admins can get in), the admin API (which is itself admin-only),
/// public endpoints (including the status the frontend reads), and health checks. Platform admins
/// are never blocked, so the operator can keep working and switch it off.</summary>
public class MaintenanceMiddleware
{
    private static readonly string[] Open = ["/api/auth", "/api/admin", "/api/public", "/api/health"];

    private readonly RequestDelegate _next;

    public MaintenanceMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IPlatformSettingsService settings)
    {
        var path = context.Request.Path;
        if (path.StartsWithSegments("/api") && !Open.Any(p => path.StartsWithSegments(p))
            && !context.User.HasClaim(JwtTokenService.PlatformAdminClaim, "true"))
        {
            var status = await settings.GetStatusAsync(context.RequestAborted);
            if (status.MaintenanceMode)
            {
                context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                context.Response.Headers.RetryAfter = "300";
                var message = string.IsNullOrWhiteSpace(status.MaintenanceMessage)
                    ? "The platform is under maintenance. Please try again shortly."
                    : status.MaintenanceMessage;
                await context.Response.WriteAsJsonAsync(ApiResponse<object?>.Fail(message));
                return;
            }
        }
        await _next(context);
    }
}
