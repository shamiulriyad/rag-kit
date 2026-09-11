using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Auth;

public record RegisterRequest(
    [Required, MinLength(2, ErrorMessage = "Enter your full name.")] string FullName,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8, ErrorMessage = "Password must be at least 8 characters.")] string Password);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record RefreshRequest([Required] string RefreshToken);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required, MinLength(8, ErrorMessage = "Password must be at least 8 characters.")] string NewPassword);

public record UpdateProfileRequest(
    [MinLength(2)] string? FullName,
    string? AvatarUrl);

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
    DateTimeOffset? LastLoginAt);

public record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    UserProfileResponse User);
