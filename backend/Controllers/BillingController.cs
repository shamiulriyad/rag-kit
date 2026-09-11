using Backend.DTOs.Billing;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/billing")]
[Tags("Billing")]
[Authorize]
public class BillingController : ApiControllerBase
{
    private readonly IBillingService _billing;

    public BillingController(IBillingService billing) => _billing = billing;

    [HttpGet("plans")]
    public async Task<ActionResult> Plans(CancellationToken ct) => Success(await _billing.GetPlansAsync(ct));

    [HttpGet("subscription")]
    public async Task<ActionResult> Subscription(CancellationToken ct) => Success(await _billing.GetSubscriptionAsync(CurrentUserId, ct));

    [HttpGet("usage")]
    public async Task<ActionResult> Usage(CancellationToken ct) => Success(await _billing.GetUsageAsync(CurrentUserId, ct));

    /// <summary>Dev-only mock plan activation - no payment provider is involved (spec section 5).</summary>
    [HttpPost("mock-activate")]
    public async Task<ActionResult> MockActivate([FromBody] MockActivateRequest request, CancellationToken ct) =>
        Success(await _billing.MockActivateAsync(CurrentUserId, request, ct), "Plan activated (mock).");
}
