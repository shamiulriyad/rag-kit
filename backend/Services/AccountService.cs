using System.Security.Cryptography;
using System.Text;
using Backend.Authentication;
using Backend.Data;
using Backend.Helpers;
using Backend.Integrations.Email;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Services;

public interface IAccountService
{
    /// <summary>Always succeeds from the caller's point of view, so the endpoint cannot be used to
    /// discover which emails have accounts.</summary>
    Task ForgotPasswordAsync(string email, CancellationToken ct);

    Task ResetPasswordAsync(string token, string newPassword, CancellationToken ct);

    Task VerifyEmailAsync(string token, CancellationToken ct);

    /// <summary>Sends (or re-sends) the verification link to a signed-in user.</summary>
    Task ResendVerificationAsync(Guid userId, CancellationToken ct);

    /// <summary>Best-effort send used right after sign-up; never throws.</summary>
    Task SendVerificationAfterRegisterAsync(User user, CancellationToken ct);
}

/// <summary>Password reset and email verification. Tokens are random, single-use and expire; only
/// their SHA-256 hash is stored. Completing a reset also signs the account out everywhere.</summary>
public class AccountService : IAccountService
{
    private static readonly TimeSpan ResetLifetime = TimeSpan.FromHours(1);
    private static readonly TimeSpan VerifyLifetime = TimeSpan.FromHours(48);
    private static readonly TimeSpan Cooldown = TimeSpan.FromSeconds(60);

    private readonly AppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly IEmailSender _email;
    private readonly EmailOptions _options;
    private readonly ISecurityEventService _security;
    private readonly ILogger<AccountService> _log;

    public AccountService(
        AppDbContext db, IPasswordHasher hasher, IEmailSender email, IOptions<EmailOptions> options,
        ISecurityEventService security, ILogger<AccountService> log)
    {
        _db = db;
        _hasher = hasher;
        _email = email;
        _options = options.Value;
        _security = security;
        _log = log;
    }

    public async Task ForgotPasswordAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalized, ct);
        await _security.RecordAsync("password_reset_requested", normalized, "/api/auth/forgot-password",
            user is null ? "Unknown email" : "Reset link requested");

        if (user is null || user.IsSuspended) return;
        if (await RecentlyIssuedAsync(user.Id, UserToken.PasswordReset, ct)) return;

        var raw = await IssueAsync(user.Id, UserToken.PasswordReset, ResetLifetime, ct);
        var link = $"{BaseUrl}/reset-password?token={Uri.EscapeDataString(raw)}";
        await TrySendAsync(user.Email, "Reset your RAG Starter password",
            $"Hi {user.FullName},\n\nSomeone asked to reset the password for this account. " +
            $"Open the link below within 1 hour to choose a new one:\n\n{link}\n\n" +
            "If this wasn't you, ignore this email - your password stays the same.", ct);
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken ct)
    {
        var stored = await FindAsync(token, UserToken.PasswordReset, ct);
        if (stored?.User is null || !stored.IsUsable)
            throw new ValidationAppException("This reset link is invalid or has expired. Request a new one.");

        PasswordPolicy.Validate(newPassword, stored.User.Email);

        var now = DateTimeOffset.UtcNow;
        var user = stored.User;
        user.PasswordHash = _hasher.Hash(newPassword);
        user.UpdatedAt = now;
        user.EmailVerifiedAt ??= now; // they received the link at this address

        stored.UsedAt = now;
        foreach (var other in await _db.UserTokens
                     .Where(t => t.UserId == user.Id && t.UsedAt == null).ToListAsync(ct))
            other.UsedAt = now;

        // A reset usually means the old password may be known to someone else: end every session.
        foreach (var rt in await _db.RefreshTokens
                     .Where(t => t.UserId == user.Id && t.RevokedAt == null).ToListAsync(ct))
            rt.RevokedAt = now;

        await _db.SaveChangesAsync(ct);
        await _security.RecordAsync("password_reset_completed", user.Email, "/api/auth/reset-password",
            "Password changed via reset link; all sessions revoked");
    }

    public async Task VerifyEmailAsync(string token, CancellationToken ct)
    {
        var stored = await FindAsync(token, UserToken.EmailVerify, ct);
        if (stored?.User is null || !stored.IsUsable)
            throw new ValidationAppException("This verification link is invalid or has expired.");

        var now = DateTimeOffset.UtcNow;
        stored.User.EmailVerifiedAt ??= now;
        stored.UsedAt = now;
        await _db.SaveChangesAsync(ct);
    }

    public async Task ResendVerificationAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("User not found.");
        if (user.EmailVerifiedAt is not null)
            throw new ConflictException("Your email is already verified.");
        if (!_email.IsConfigured)
            throw new AppException("Email delivery is not set up on this server.", StatusCodes.Status503ServiceUnavailable);
        if (await RecentlyIssuedAsync(user.Id, UserToken.EmailVerify, ct))
            throw new AppException("Please wait a minute before requesting another email.", StatusCodes.Status429TooManyRequests);

        await SendVerificationAsync(user, ct);
    }

    public async Task SendVerificationAfterRegisterAsync(User user, CancellationToken ct)
    {
        try
        {
            if (_email.IsConfigured) await SendVerificationAsync(user, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _log.LogWarning(ex, "Could not send the verification email to {Email}", user.Email);
        }
    }

    private async Task SendVerificationAsync(User user, CancellationToken ct)
    {
        var raw = await IssueAsync(user.Id, UserToken.EmailVerify, VerifyLifetime, ct);
        var link = $"{BaseUrl}/verify-email?token={Uri.EscapeDataString(raw)}";
        await _email.SendAsync(user.Email, "Verify your RAG Starter email",
            $"Hi {user.FullName},\n\nConfirm this is your email address by opening:\n\n{link}\n\n" +
            "The link is valid for 48 hours.", ct);
    }

    private string BaseUrl => _options.AppBaseUrl.TrimEnd('/');

    private async Task TrySendAsync(string to, string subject, string body, CancellationToken ct)
    {
        try
        {
            await _email.SendAsync(to, subject, body, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _log.LogError(ex, "Could not send '{Subject}' to {To}", subject, to);
        }
    }

    private Task<bool> RecentlyIssuedAsync(Guid userId, string purpose, CancellationToken ct)
    {
        var since = DateTimeOffset.UtcNow - Cooldown;
        return _db.UserTokens.AnyAsync(t => t.UserId == userId && t.Purpose == purpose && t.CreatedAt > since, ct);
    }

    /// <summary>Retires older unused tokens of the same kind and returns the new raw token.</summary>
    private async Task<string> IssueAsync(Guid userId, string purpose, TimeSpan lifetime, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var old in await _db.UserTokens
                     .Where(t => t.UserId == userId && t.Purpose == purpose && t.UsedAt == null).ToListAsync(ct))
            old.UsedAt = now;

        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        _db.UserTokens.Add(new UserToken
        {
            UserId = userId,
            Purpose = purpose,
            TokenHash = Hash(raw),
            ExpiresAt = now + lifetime,
        });
        await _db.SaveChangesAsync(ct);
        return raw;
    }

    private Task<UserToken?> FindAsync(string raw, string purpose, CancellationToken ct)
    {
        var hash = Hash(raw.Trim());
        return _db.UserTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.Purpose == purpose, ct);
    }

    private static string Hash(string raw) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
