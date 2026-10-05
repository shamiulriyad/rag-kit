using System.ComponentModel.DataAnnotations;
using Backend.DTOs.Common;

namespace Backend.DTOs.Auth;

public record RegisterRequest(
    [Required, MinLength(2, ErrorMessage = "Enter your full name."), MaxLength(100, ErrorMessage = "Name can be at most 100 characters.")] string FullName,
    [Required, EmailAddress, MaxLength(254, ErrorMessage = "Email can be at most 254 characters.")] string Email,
    [Required, MinLength(8, ErrorMessage = "Password must be at least 8 characters."), MaxLength(128, ErrorMessage = "Password can be at most 128 characters.")] string Password);

public record LoginRequest(
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MaxLength(128)] string Password);

public record ForgotPasswordRequest([Required, EmailAddress, MaxLength(254)] string Email);
public record ResetPasswordRequest(
    [Required, MaxLength(200)] string Token,
    [Required, MinLength(8, ErrorMessage = "Password must be at least 8 characters."), MaxLength(128, ErrorMessage = "Password can be at most 128 characters.")] string NewPassword);
public record VerifyEmailRequest([Required, MaxLength(200)] string Token);
public record RefreshRequest([Required] string RefreshToken);

public record ChangePasswordRequest(
    [Required, MaxLength(128)] string CurrentPassword,
    [Required, MinLength(8, ErrorMessage = "Password must be at least 8 characters."), MaxLength(128, ErrorMessage = "Password can be at most 128 characters.")] string NewPassword);

public record UpdateProfileRequest(
    [MinLength(2), MaxLength(100)] string? FullName,
    [HttpUrl] string? AvatarUrl);

/// <summary>What the frontend's mock <c>MockUser</c> becomes for real - see
/// frontend/src/lib/auth.tsx, which this response is shaped to replace.</summary>
public record UserProfileResponse(
    Guid Id,
    string Email,
    string FullName,
    string? AvatarUrl,
    string Role,
    string PlanCode,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? LastLoginAt,
    bool EmailVerified);

public record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    UserProfileResponse User);
