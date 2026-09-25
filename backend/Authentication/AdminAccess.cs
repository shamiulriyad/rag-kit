namespace Backend.Authentication;

/// <summary>Everything an admin action can be gated on. Today a platform admin holds all of
/// them; roles that hold a subset (support, read-only) will map onto this same list, and the
/// frontend only uses it to hide controls - the API is what enforces access.</summary>
public static class AdminPermissions
{
    public const string ViewDashboard = "dashboard.view";
    public const string ViewUsers = "users.view";
    public const string ManageUsers = "users.manage";
    public const string ViewWorkspaces = "workspaces.view";
    public const string ViewJobs = "jobs.view";
    public const string ManageJobs = "jobs.manage";
    public const string ViewHealth = "health.view";
    public const string ViewBusiness = "business.view";
    public const string ViewAudit = "audit.view";
    public const string ViewCms = "cms.view";
    public const string ManageCms = "cms.manage";
    public const string ViewSecurity = "security.view";
    public const string ManageSecurity = "security.manage";
    public const string ViewSupport = "support.view";
    public const string ManageSupport = "support.manage";
    public const string ViewSettings = "settings.view";
    public const string ManageSettings = "settings.manage";

    public static readonly string[] All =
    [
        ViewDashboard, ViewUsers, ManageUsers, ViewWorkspaces, ViewJobs, ManageJobs,
        ViewHealth, ViewBusiness, ViewAudit, ViewCms, ManageCms, ViewSecurity, ManageSecurity, ViewSupport, ManageSupport, ViewSettings, ManageSettings,
    ];
}

/// <summary>Who counts as a platform admin (the /admin panel). Every account is created
/// with the per-resource role Owner, so that role cannot tell operators apart from customers;
/// instead admins are the emails listed in config <c>Admin:Emails</c> (env <c>Admin__Emails</c>,
/// comma separated). The check happens server-side when the JWT is issued, so a user cannot
/// grant themselves access.</summary>
public class AdminAccess
{
    public const string Policy = "PlatformAdmin";

    private readonly HashSet<string> _emails;

    public AdminAccess(IConfiguration config)
    {
        var raw = config["Admin:Emails"] ?? "";
        _emails = raw
            .Split([',', ';', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(e => e.ToLowerInvariant())
            .ToHashSet();
    }

    public bool IsAdmin(string? email) => email is not null && _emails.Contains(email.Trim().ToLowerInvariant());
}
