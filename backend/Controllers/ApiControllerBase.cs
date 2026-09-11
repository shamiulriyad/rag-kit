using Backend.DTOs.Common;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Base for every controller: wraps results in <see cref="ApiResponse{T}"/> and
/// exposes the caller's id from JWT claims. Controllers stay thin - this is the only
/// shared plumbing, business logic lives in Services.</summary>
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>The authenticated user's id, from the JWT "sub" claim set by
    /// Authentication/JwtTokenService. Never trust an id coming from the request body/route.</summary>
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

    protected ActionResult Success<T>(T data, string? message = null) =>
        Ok(ApiResponse<T>.Ok(data, message));

    protected ActionResult Success(string? message = null) =>
        Ok(ApiResponse.Ok(message));
}
