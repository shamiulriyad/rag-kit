using Backend.DTOs.Auth;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/users")]
[Tags("Users")]
[Authorize]
public class UsersController : ApiControllerBase
{
    private readonly IUserService _users;
    private readonly IAuthService _auth;

    public UsersController(IUserService users, IAuthService auth)
    {
        _users = users;
        _auth = auth;
    }

    [HttpGet("me")]
    public async Task<ActionResult> Me(CancellationToken ct) =>
        Success(await _users.GetMeAsync(CurrentUserId, ct));

    [HttpPut("me")]
    [Authorize(Policy = Backend.Authentication.ApiKeyAuthenticationHandler.SessionOnlyPolicy)]
    public async Task<ActionResult> UpdateMe([FromBody] UpdateProfileRequest request, CancellationToken ct) =>
        Success(await _users.UpdateMeAsync(CurrentUserId, request, ct), "Profile updated.");

    [HttpPut("me/password")]
    [Authorize(Policy = Backend.Authentication.ApiKeyAuthenticationHandler.SessionOnlyPolicy)]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        // Every other session is ended; the caller gets a fresh token pair so this device stays signed in.
        return Success(await _auth.ChangePasswordAsync(CurrentUserId, request, ct), "Password updated.");
    }
}
