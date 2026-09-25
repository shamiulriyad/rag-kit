namespace Backend.Models;

/// <summary>Platform-wide switches an operator can change at runtime. A single row (Id = 1).</summary>
public class PlatformSettings
{
    public int Id { get; set; } = 1;

    /// <summary>When on, every customer API request is refused with 503. Admins keep working.</summary>
    public bool MaintenanceMode { get; set; }
    public string MaintenanceMessage { get; set; } = string.Empty;

    /// <summary>When off, new accounts cannot be created. Existing users are unaffected.</summary>
    public bool SignupsEnabled { get; set; } = true;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string UpdatedByEmail { get; set; } = string.Empty;
}
