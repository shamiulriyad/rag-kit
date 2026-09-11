namespace Backend.Helpers;

/// <summary>Base for any error a service raises on purpose (bad input, missing resource,
/// no permission, plan limit hit...). The exception middleware turns this straight into
/// the standard <c>{ success:false, message, errors }</c> envelope with the right status
/// code - services never touch HttpContext or status codes directly.</summary>
public class AppException : Exception
{
    public int StatusCode { get; }
    public IReadOnlyList<string> Errors { get; }

    public AppException(string message, int statusCode = StatusCodes.Status400BadRequest, IEnumerable<string>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors?.ToList() ?? [];
    }
}

public sealed class NotFoundException(string message) : AppException(message, StatusCodes.Status404NotFound);

public sealed class ForbiddenException(string message = "You do not have permission to access this resource.")
    : AppException(message, StatusCodes.Status403Forbidden);

public sealed class UnauthorizedAppException(string message = "Invalid credentials.")
    : AppException(message, StatusCodes.Status401Unauthorized);

public sealed class ConflictException(string message) : AppException(message, StatusCodes.Status409Conflict);

public sealed class ValidationAppException(string message, IEnumerable<string>? errors = null)
    : AppException(message, StatusCodes.Status422UnprocessableEntity, errors);

/// <summary>Raised when an action would push a user over their plan's limit
/// (documents, storage, chunks, questions/month, Knowledge Bases).</summary>
public sealed class PlanLimitExceededException(string message)
    : AppException(message, StatusCodes.Status402PaymentRequired);
