using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Backend.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Authentication;

/// <summary>Authenticates programmatic callers with a key made on the Developer Portal. Send it as
/// <c>X-API-Key: rsk_live_...</c> or <c>Authorization: Bearer rsk_live_...</c>. The caller acts as
/// the key's owner, with the owner's plan limits and Knowledge Base access.
///
/// Deliberately weaker than a signed-in session: the principal never carries the platform-admin
/// claim, and it is tagged <see cref="MethodClaim"/>=<see cref="MethodApiKey"/> so the
/// <see cref="SessionOnlyPolicy"/> endpoints (managing keys, changing the password or profile,
/// plan changes) refuse it - a leaked key cannot mint more keys or take over the account.</summary>
public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string Scheme = "ApiKey";
    public const string Header = "X-API-Key";
    public const string KeyPrefix = "rsk_";
    public const string MethodClaim = "auth_method";
    public const string MethodApiKey = "api_key";
    public const string SessionOnlyPolicy = "SessionOnly";

    private readonly AppDbContext _db;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, AppDbContext db)
        : base(options, logger, encoder) => _db = db;

    /// <summary>Used by the policy scheme to route a request here instead of to JWT validation.</summary>
    public static bool LooksLikeApiKey(HttpRequest request) => ExtractKey(request) is not null;

    private static string? ExtractKey(HttpRequest request)
    {
        if (request.Headers.TryGetValue(Header, out var h) && !string.IsNullOrWhiteSpace(h.ToString()))
            return h.ToString().Trim();

        var auth = request.Headers.Authorization.ToString();
        if (auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth["Bearer ".Length..].Trim();
            if (token.StartsWith(KeyPrefix, StringComparison.Ordinal)) return token;
        }

        return null;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var raw = ExtractKey(Request);
        if (raw is null) return AuthenticateResult.NoResult();

        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
        var key = await _db.ApiKeys.Include(k => k.User)
            .FirstOrDefaultAsync(k => k.KeyHash == hash, Context.RequestAborted);

        var now = DateTimeOffset.UtcNow;
        if (key is null || key.RevokedAt is not null || (key.ExpiresAt is not null && key.ExpiresAt <= now))
            return AuthenticateResult.Fail("Invalid or expired API key.");
        if (key.User is null || key.User.IsSuspended)
            return AuthenticateResult.Fail("Account unavailable.");

        // Cheap "last used" stamp, at most every few minutes so reads don't turn into writes.
        if (key.LastUsedAt is null || now - key.LastUsedAt > TimeSpan.FromMinutes(5))
        {
            key.LastUsedAt = now;
            await _db.SaveChangesAsync(Context.RequestAborted);
        }

        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, key.User.Id.ToString()),
            new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email, key.User.Email),
            new Claim(ClaimTypes.Role, key.User.Role.ToString()),
            new Claim(MethodClaim, MethodApiKey),
        ], Scheme);

        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme));
    }
}
