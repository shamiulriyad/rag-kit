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
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public BillingController(IBillingService billing, IConfiguration config, IWebHostEnvironment env)
    {
        _billing = billing;
        _config = config;
        _env = env;
    }

    [HttpGet("plans")]
    public async Task<ActionResult> Plans(CancellationToken ct) => Success(await _billing.GetPlansAsync(ct));

    [HttpGet("subscription")]
    public async Task<ActionResult> Subscription(CancellationToken ct) => Success(await _billing.GetSubscriptionAsync(CurrentUserId, ct));

    [HttpGet("usage")]
    public async Task<ActionResult> Usage(CancellationToken ct) => Success(await _billing.GetUsageAsync(CurrentUserId, ct));

    /// <summary>Dev-only mock plan activation - no payment provider is involved (spec section 5).
    /// Anyone who can call this changes their own plan for free, so it is only on in Development
    /// unless <c>Billing:AllowMockActivation</c> (env <c>Billing__AllowMockActivation</c>) is true.</summary>
    [HttpPost("mock-activate")]
    [Authorize(Policy = Backend.Authentication.ApiKeyAuthenticationHandler.SessionOnlyPolicy)]
    public async Task<ActionResult> MockActivate([FromBody] MockActivateRequest request, CancellationToken ct)
    {
        var allowed = _config.GetValue<bool?>("Billing:AllowMockActivation") ?? _env.IsDevelopment();
        if (!allowed)
            throw new Backend.Helpers.ForbiddenException(
                "Plan changes are disabled on this server: no payment provider is connected.");

        return Success(await _billing.MockActivateAsync(CurrentUserId, request, ct), "Plan activated (mock).");
    }
}
