using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/activity")]
[Tags("Activity")]
[Authorize]
public class ActivityController : ApiControllerBase
{
    private readonly IActivityLogService _activity;

    public ActivityController(IActivityLogService activity) => _activity = activity;

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] int limit, CancellationToken ct) =>
        Success(await _activity.ListAsync(CurrentUserId, limit is > 0 and <= 200 ? limit : 100, ct));

    [HttpDelete]
    public async Task<ActionResult> Clear(CancellationToken ct)
    {
        await _activity.ClearAsync(CurrentUserId, ct);
        return Success("Activity cleared.");
    }
}
