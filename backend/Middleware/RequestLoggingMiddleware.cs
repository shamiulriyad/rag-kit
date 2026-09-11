using System.Diagnostics;

namespace Backend.Middleware;

/// <summary>One structured log line per request: method, path, status, duration, caller.
/// Never logs bodies (avoids leaking PDFs, passwords, tokens).</summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _log;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> log)
    {
        _next = next;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            _log.LogInformation(
                "{Method} {Path} -> {StatusCode} ({ElapsedMs}ms) user={User}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds,
                context.User.Identity?.IsAuthenticated == true ? context.User.Identity.Name ?? "authenticated" : "anonymous");
        }
    }
}
