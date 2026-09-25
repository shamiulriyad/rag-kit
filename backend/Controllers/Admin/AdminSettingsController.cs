using System.ComponentModel.DataAnnotations;
using Backend.Controllers;
using Backend.Services;
using Backend.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Admin;

public record AdminSettingsResponse(
    bool MaintenanceMode, string MaintenanceMessage, bool SignupsEnabled, DateTimeOffset? UpdatedAt, string? UpdatedBy);

public class AdminSettingsRequest
{
    public bool MaintenanceMode { get; set; }
    [MaxLength(300)] public string? MaintenanceMessage { get; set; }
    public bool SignupsEnabled { get; set; }
}

[Tags("Admin - Settings")]
[Route("api/admin/settings")]
public class AdminSettingsController(
    IPlatformSettingsService settings, IAdminAuditService audit, ICurrentUserService current) : AdminControllerBase
{
    private static AdminSettingsResponse ToResponse(Backend.Models.PlatformSettings s, bool saved) =>
        new(s.MaintenanceMode, s.MaintenanceMessage, s.SignupsEnabled, saved ? s.UpdatedAt : null, saved ? s.UpdatedByEmail : null);

    [HttpGet]
    public async Task<ActionResult> Get(CancellationToken ct)
    {
        var s = await settings.GetAsync(ct);
        return Success(ToResponse(s, !string.IsNullOrEmpty(s.UpdatedByEmail)));
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] AdminSettingsRequest r, CancellationToken ct)
    {
        var before = await settings.GetAsync(ct);
        var s = await settings.UpdateAsync(r.MaintenanceMode, r.MaintenanceMessage, r.SignupsEnabled, current.Email, ct);

        var changes = new List<string>();
        if (before.MaintenanceMode != s.MaintenanceMode) changes.Add($"maintenance {(s.MaintenanceMode ? "ON" : "off")}");
        if (before.SignupsEnabled != s.SignupsEnabled) changes.Add($"signups {(s.SignupsEnabled ? "on" : "CLOSED")}");
        if (before.MaintenanceMessage != s.MaintenanceMessage) changes.Add("maintenance message edited");
        await audit.LogAsync("settings.update", "settings", "platform", details: changes.Count > 0 ? string.Join(", ", changes) : "saved without changes", ct: ct);

        return Success(ToResponse(s, true), "Settings saved.");
    }
}

/// <summary>What the customer frontend may know before sign-in: whether it can show the sign-up form
/// and whether to show the maintenance notice. Nothing else from settings is exposed.</summary>
[Route("api/public/status")]
[Tags("Public content")]
[AllowAnonymous]
public class PublicStatusController(IPlatformSettingsService settings) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult> Get(CancellationToken ct) => Success(await settings.GetStatusAsync(ct));
}
