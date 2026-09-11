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

    public UsersController(IUserService users) => _users = users;

    [HttpGet("me")]
    public async Task<ActionResult> Me(CancellationToken ct) =>
        Success(await _users.GetMeAsync(CurrentUserId, ct));

    [HttpPut("me")]
    public async Task<ActionResult> UpdateMe([FromBody] UpdateProfileRequest request, CancellationToken ct) =>
        Success(await _users.UpdateMeAsync(CurrentUserId, request, ct), "Profile updated.");

    [HttpPut("me/password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        await _users.ChangePasswordAsync(CurrentUserId, request, ct);
        return Success("Password updated.");
    }
}
