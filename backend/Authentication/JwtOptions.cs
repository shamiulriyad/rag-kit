namespace Backend.Authentication;

/// <summary>Bound from the "Jwt" config section / Jwt__* env vars. <see cref="Secret"/> must
/// never be committed - see .env.example. Never exposed to the frontend.</summary>
public class JwtOptions
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "rag-starter";
    public string Audience { get; set; } = "rag-starter-client";
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 30;
}
