using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/analytics")]
[Tags("Analytics")]
[Authorize]
public class AnalyticsController : ApiControllerBase
{
    private readonly IAnalyticsService _analytics;
    private readonly IBillingService _billing;

    public AnalyticsController(IAnalyticsService analytics, IBillingService billing)
    {
        _analytics = analytics;
        _billing = billing;
    }

    [HttpGet("overview")]
    public async Task<ActionResult> Overview(CancellationToken ct) => Success(await _analytics.GetOverviewAsync(CurrentUserId, ct));

    [HttpGet("questions")]
    public async Task<ActionResult> Questions([FromQuery] int days, CancellationToken ct) =>
        Success(await _analytics.GetQuestionsOverTimeAsync(CurrentUserId, days is > 0 ? days : 30, ct));

    [HttpGet("documents")]
    public async Task<ActionResult> Documents([FromQuery] int days, CancellationToken ct) =>
        Success(await _analytics.GetDocumentsOverTimeAsync(CurrentUserId, days is > 0 ? days : 30, ct));

    [HttpGet("usage")]
    public async Task<ActionResult> Usage(CancellationToken ct) => Success(await _billing.GetUsageAsync(CurrentUserId, ct));
}
