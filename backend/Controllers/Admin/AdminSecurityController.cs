using Backend.Services.Admin;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Admin;

[Tags("Admin - Security")]
[Route("api/admin/security")]
public class AdminSecurityController(IAdminSecurityService security) : AdminControllerBase
{
    [HttpGet("events")]
    public async Task<ActionResult> Events(
        [FromQuery] string? search, [FromQuery] string? type, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await security.ListEventsAsync(false, search, type, page, pageSize is > 0 ? pageSize : 25, ct));

    [HttpGet("rate-limits")]
    public async Task<ActionResult> RateLimits(
        [FromQuery] string? search, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await security.ListEventsAsync(true, search, null, page, pageSize is > 0 ? pageSize : 25, ct));

    [HttpGet("admins")]
    public async Task<ActionResult> Admins(CancellationToken ct) => Success(await security.ListAdminsAsync(ct));

    [HttpGet("roles")]
    public ActionResult Roles() => Success(security.ListRoles());

    [HttpGet("api-keys")]
    public async Task<ActionResult> ApiKeys(
        [FromQuery] string? search, [FromQuery] string? status, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await security.ListApiKeysAsync(search, status, page, pageSize is > 0 ? pageSize : 20, ct));

    [HttpPost("api-keys/{id:guid}/revoke")]
    public async Task<ActionResult> Revoke(Guid id, CancellationToken ct)
    {
        await security.RevokeApiKeyAsync(id, ct);
        return Success("API key revoked.");
    }
}
