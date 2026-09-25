using System.Collections.Concurrent;
using AspNetCoreRateLimit;
using Backend.Data;
using Backend.Models;
using Microsoft.Extensions.Options;

namespace Backend.Services;

public interface ISecurityEventService
{
    Task RecordAsync(string type, string? email, string? path = null, string? details = null, string? ip = null);
}

/// <summary>Writes security events. It must never break the request it is observing, so a
/// failure to record is swallowed. Uses its own scope so it is safe to call from middleware.</summary>
public class SecurityEventService : ISecurityEventService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly IHttpContextAccessor _http;
    private readonly ILogger<SecurityEventService> _log;

    public SecurityEventService(IServiceScopeFactory scopes, IHttpContextAccessor http, ILogger<SecurityEventService> log)
    {
        _scopes = scopes;
        _http = http;
        _log = log;
    }

    private static string? Cut(string? s, int max) => s is null ? null : s.Length <= max ? s : s[..max];

    public async Task RecordAsync(string type, string? email, string? path = null, string? details = null, string? ip = null)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.SecurityEvents.Add(new SecurityEvent
            {
                Type = type,
                Email = Cut(email?.Trim().ToLowerInvariant(), 320),
                IpAddress = Cut(ip ?? _http.HttpContext?.Connection.RemoteIpAddress?.ToString(), 64),
                Path = Cut(path, 200),
                Details = Cut(details, 300),
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Could not record security event {Type}", type);
        }
    }
}

/// <summary>The stock IP rate limiter, plus a record of every request it blocks. At most one
/// event per client and path per minute is stored, so an attack cannot flood the table.</summary>
public class RecordingIpRateLimitMiddleware : IpRateLimitMiddleware
{
    private static readonly ConcurrentDictionary<string, DateTimeOffset> Seen = new();
    private readonly ISecurityEventService _events;

    public RecordingIpRateLimitMiddleware(
        RequestDelegate next, IProcessingStrategy processingStrategy, IOptions<IpRateLimitOptions> options,
        IIpPolicyStore policyStore, IRateLimitConfiguration config, ILogger<IpRateLimitMiddleware> logger,
        ISecurityEventService events)
        : base(next, processingStrategy, options, policyStore, config, logger) => _events = events;

    protected override void LogBlockedRequest(
        HttpContext httpContext, ClientRequestIdentity identity, RateLimitCounter counter, RateLimitRule rule)
    {
        base.LogBlockedRequest(httpContext, identity, counter, rule);

        var key = $"{identity.ClientIp}|{identity.Path}";
        var now = DateTimeOffset.UtcNow;
        if (Seen.TryGetValue(key, out var last) && now - last < TimeSpan.FromMinutes(1)) return;
        Seen[key] = now;
        if (Seen.Count > 5000)
            foreach (var kv in Seen.Where(kv => now - kv.Value > TimeSpan.FromMinutes(1)).ToList()) Seen.TryRemove(kv.Key, out _);

        _ = _events.RecordAsync("rate_limited", null, identity.Path,
            $"{identity.HttpVerb} blocked: limit {rule.Limit} per {rule.Period}", identity.ClientIp);
    }
}
