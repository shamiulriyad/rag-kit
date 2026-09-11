using Backend.DTOs.Settings;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/settings")]
[Tags("Settings")]
[Authorize]
public class SettingsController : ApiControllerBase
{
    private readonly ISettingsService _settings;

    public SettingsController(ISettingsService settings) => _settings = settings;

    [HttpGet]
    public async Task<ActionResult> Get(CancellationToken ct) => Success(await _settings.GetAsync(CurrentUserId, ct));

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] UpdateUserSettingsRequest request, CancellationToken ct) =>
        Success(await _settings.UpdateAsync(CurrentUserId, request, ct), "Settings updated.");
}
