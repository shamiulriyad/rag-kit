using Backend.DTOs.Common;
using Backend.Helpers;
using Backend.Integrations.PythonRag;

namespace Backend.Middleware;

/// <summary>Central place every unhandled failure passes through. Every response - success
/// or error - leaves the API as JSON, never a dropped connection React can only report as
/// "Failed to fetch" (spec: centralized exception handling).</summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _log;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> log)
    {
        _next = next;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _log.LogWarning(ex, "Request failed: {Message}", ex.Message);
            await WriteAsync(context, ex.StatusCode, ex.Message, ex.Errors);
        }
        catch (RagException ex)
        {
            _log.LogError(ex, "RAG service call failed");
            await WriteAsync(context, ex.StatusCode, ex.Message);
        }
        catch (BadHttpRequestException ex)
        {
            _log.LogWarning(ex, "Rejected request (malformed or over the body-size limit)");
            await WriteAsync(context, StatusCodes.Status413PayloadTooLarge,
                "The request body is malformed or exceeds the configured upload limit.");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled error");
            await WriteAsync(context, StatusCodes.Status500InternalServerError,
                "Unexpected error in the backend. Check its logs.");
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string message, IReadOnlyList<string>? errors = null)
    {
        if (context.Response.HasStarted) return;
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(ApiResponse<object?>.Fail(message, errors));
    }
}
