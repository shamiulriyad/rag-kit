namespace Backend.Integrations.Supabase;

/// <summary>Bound from the "Supabase" config section / Supabase__* env vars (spec section 26).
/// Never sent to the frontend - only this backend ever sees <see cref="ServiceRoleKey"/>.</summary>
public class SupabaseOptions
{
    public string Url { get; set; } = string.Empty;
    public string AnonKey { get; set; } = string.Empty;
    public string ServiceRoleKey { get; set; } = string.Empty;
    public string StorageBucket { get; set; } = "documents";

    /// <summary>True once a real project is configured. When false, the backend falls back
    /// to local-disk storage so `docker compose up` still works with zero Supabase setup -
    /// see Program.cs.</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Url) && !string.IsNullOrWhiteSpace(ServiceRoleKey);
}
