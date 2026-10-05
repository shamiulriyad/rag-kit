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

    private readonly IAccountService _account;

    public AuthController(IAuthService auth, IAccountService account)
    {
        _auth = auth;
        _account = account;
    }

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

    /// <summary>Always answers 200 whether or not the address has an account.</summary>
    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await _account.ForgotPasswordAsync(request.Email, ct);
        return Success("If an account exists for that email, a reset link is on its way.");
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await _account.ResetPasswordAsync(request.Token, request.NewPassword, ct);
        return Success("Password updated. Sign in with your new password.");
    }

    [HttpPost("verify-email")]
    public async Task<ActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken ct)
    {
        await _account.VerifyEmailAsync(request.Token, ct);
        return Success("Email verified.");
    }

    [HttpPost("resend-verification")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult> ResendVerification(CancellationToken ct)
    {
        await _account.ResendVerificationAsync(CurrentUserId, ct);
        return Success("Verification email sent.");
    }
}
