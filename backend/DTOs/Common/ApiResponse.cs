namespace Backend.DTOs.Common;

/// <summary>The one response shape every endpoint returns (spec section 28) - success or
/// error, never a bare object and never a dropped connection.</summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string> Errors { get; set; } = [];

    public static ApiResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message, IEnumerable<string>? errors = null) =>
        new() { Success = false, Message = message, Errors = errors?.ToList() ?? [] };
}

/// <summary>Non-generic helper for endpoints that only ever return a message (e.g. delete).</summary>
public static class ApiResponse
{
    public static ApiResponse<object?> Ok(string? message = null) =>
        new() { Success = true, Message = message };
}

/// <summary>A page of results plus the total count, for list endpoints.</summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
