using Backend.DTOs.Auth;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Register/login/refresh/logout. No endpoint here requires authentication -
/// everything past this controller does.</summary>
[Route("api/auth")]
[Tags("Auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct) =>
        Success(await _auth.RegisterAsync(request, ct), "Account created.");

    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] LoginRequest request, CancellationToken ct) =>
        Success(await _auth.LoginAsync(request, ct), "Signed in.");

    [HttpPost("refresh")]
    public async Task<ActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct) =>
        Success(await _auth.RefreshAsync(request.RefreshToken, ct), "Token refreshed.");

    [HttpPost("logout")]
    public async Task<ActionResult> Logout([FromBody] RefreshRequest request, CancellationToken ct)
    {
        await _auth.LogoutAsync(request.RefreshToken, ct);
        return Success("Signed out.");
    }
}
