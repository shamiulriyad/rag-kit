using Backend.Authentication;
using Backend.DTOs.Admin;
using Backend.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Admin;

/// <summary>Every admin endpoint requires the PlatformAdmin policy, enforced here on the server -
/// the frontend hiding a menu item is a convenience, never the control.</summary>
[Route("api/admin")]
[Authorize(Policy = AdminAccess.Policy)]
public abstract class AdminControllerBase : ApiControllerBase;

/// <summary>Lets any signed-in user ask "am I an admin?" so the UI can decide whether to show the
/// panel, without provoking a 403.</summary>
[Route("api/admin/access")]
[Tags("Admin")]
[Authorize]
public class AdminAccessController : ApiControllerBase
{
    [HttpGet]
    public ActionResult Get()
    {
        var isAdmin = User.HasClaim(JwtTokenService.PlatformAdminClaim, "true");
        return Success(new AdminAccessResponse(isAdmin, isAdmin ? [.. AdminPermissions.All] : []));
    }
}

[Tags("Admin - Dashboard")]
public class AdminDashboardController(IAdminDashboardService dashboard, IAdminResourceService resources) : AdminControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult> Get([FromQuery] int days, CancellationToken ct) =>
        Success(await dashboard.GetAsync(days is > 0 ? days : 30, ct));

    [HttpGet("timeseries")]
    public async Task<ActionResult> TimeSeries([FromQuery] int days, CancellationToken ct) =>
        Success(await dashboard.GetTimeSeriesAsync(days is > 0 ? days : 30, ct));

    [HttpGet("search")]
    public async Task<ActionResult> Search([FromQuery] string q, CancellationToken ct) =>
        Success(await resources.SearchAsync(q, ct));
}

[Tags("Admin - Users")]
[Route("api/admin/users")]
public class AdminUsersController(IAdminUserService users) : AdminControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List(
        [FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? plan,
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await users.ListAsync(search, status, plan, page, pageSize is > 0 ? pageSize : 20, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await users.GetAsync(id, ct));

    [HttpPost("{id:guid}/suspend")]
    public async Task<ActionResult> Suspend(Guid id, [FromBody] SuspendUserRequest request, CancellationToken ct)
    {
        await users.SuspendAsync(id, request.Reason, ct);
        return Success("User suspended.");
    }

    [HttpPost("{id:guid}/reactivate")]
    public async Task<ActionResult> Reactivate(Guid id, CancellationToken ct)
    {
        await users.ReactivateAsync(id, ct);
        return Success("User reactivated.");
    }

    [HttpPut("{id:guid}/plan")]
    public async Task<ActionResult> SetPlan(Guid id, [FromBody] AdminSetPlanRequest request, CancellationToken ct)
    {
        await users.SetPlanAsync(id, request.PlanCode, ct);
        return Success("Plan updated.");
    }
}

[Tags("Admin - Workspaces and documents")]
public class AdminResourcesController(IAdminResourceService resources) : AdminControllerBase
{
    private static int Size(int n) => n is > 0 ? n : 20;

    [HttpGet("workspaces")]
    public async Task<ActionResult> Workspaces([FromQuery] string? search, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await resources.ListWorkspacesAsync(search, page, Size(pageSize), ct));

    [HttpGet("workspaces/{id:guid}")]
    public async Task<ActionResult> Workspace(Guid id, CancellationToken ct) => Success(await resources.GetWorkspaceAsync(id, ct));

    [HttpGet("knowledge-bases")]
    public async Task<ActionResult> KnowledgeBases([FromQuery] string? search, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await resources.ListKnowledgeBasesAsync(search, page, Size(pageSize), ct));

    [HttpGet("documents")]
    public async Task<ActionResult> Documents(
        [FromQuery] string? search, [FromQuery] string? status, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await resources.ListDocumentsAsync(search, status, page, Size(pageSize), ct));

    [HttpGet("invitations")]
    public async Task<ActionResult> Invitations([FromQuery] string? status, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await resources.ListInvitationsAsync(status, page, Size(pageSize), ct));
}

[Tags("Admin - RAG operations")]
public class AdminJobsController(IAdminJobService jobs) : AdminControllerBase
{
    [HttpGet("jobs")]
    public async Task<ActionResult> List(
        [FromQuery] string? status, [FromQuery] string? search, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await jobs.ListAsync(status, search, page, pageSize is > 0 ? pageSize : 20, ct));

    [HttpGet("jobs/{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await jobs.GetAsync(id, ct));

    [HttpPost("jobs/{id:guid}/retry")]
    public async Task<ActionResult> Retry(Guid id, CancellationToken ct)
    {
        await jobs.RetryAsync(id, ct);
        return Success("Job re-queued.");
    }

    [HttpPost("documents/{id:guid}/reprocess")]
    public async Task<ActionResult> Reprocess(Guid id, CancellationToken ct)
    {
        await jobs.ReprocessDocumentAsync(id, ct);
        return Success("Document queued for reprocessing.");
    }
}

[Tags("Admin - System")]
public class AdminSystemController(IAdminHealthService health, IAdminAuditService audit) : AdminControllerBase
{
    [HttpGet("health")]
    public async Task<ActionResult> Health(CancellationToken ct) => Success(await health.CheckAsync(ct));

    [HttpGet("audit")]
    public async Task<ActionResult> Audit(
        [FromQuery] string? search, [FromQuery] string? result, [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await audit.ListAsync(search, result, page, pageSize is > 0 ? pageSize : 25, ct));
}

[Tags("Admin - Business")]
public class AdminBusinessController(IAdminBusinessService business) : AdminControllerBase
{
    [HttpGet("plans")]
    public async Task<ActionResult> Plans(CancellationToken ct) => Success(await business.ListPlansAsync(ct));

    [HttpGet("usage")]
    public async Task<ActionResult> Usage([FromQuery] int months, [FromServices] IAdminUsageService usage, CancellationToken ct) =>
        Success(await usage.GetAsync(months is > 0 ? months : 6, ct));

    [HttpGet("billing-events")]
    public async Task<ActionResult> BillingEvents(
        [FromQuery] int page, [FromQuery] int pageSize, [FromServices] IAdminUsageService usage, CancellationToken ct) =>
        Success(await usage.ListBillingEventsAsync(page, pageSize is > 0 ? pageSize : 20, ct));

    [HttpGet("subscriptions")]
    public async Task<ActionResult> Subscriptions([FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await business.ListSubscriptionsAsync(page, pageSize is > 0 ? pageSize : 20, ct));
}
