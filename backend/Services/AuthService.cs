using Backend.Authentication;
using Backend.Data;
using Backend.DTOs.Auth;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<AuthResponse> RefreshAsync(string refreshTokenRaw, CancellationToken ct);
    Task LogoutAsync(string refreshTokenRaw, CancellationToken ct);

    /// <summary>Changes the password, ends every other session and returns a fresh token pair for
    /// the device that made the change.</summary>
    Task<AuthResponse> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct);
}

/// <summary>Register/login/refresh/logout. Owns password hashing and JWT issuance;
/// everything else (profile CRUD) lives in <see cref="UserService"/>.</summary>
public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _jwt;
    private readonly JwtOptions _jwtOptions;
    private readonly IActivityLogService _activity;
    private readonly ISecurityEventService _security;
    private readonly IPlatformSettingsService _platform;
    private readonly IAccountService _account;
    private static readonly TimeSpan ReuseGrace = TimeSpan.FromSeconds(30);

    public AuthService(
        AppDbContext db,
        IPasswordHasher hasher,
        IJwtTokenService jwt,
        Microsoft.Extensions.Options.IOptions<JwtOptions> jwtOptions,
        IActivityLogService activity,
        ISecurityEventService security,
        IPlatformSettingsService platform,
        IAccountService account)
    {
        _account = account;
        _db = db;
        _hasher = hasher;
        _jwt = jwt;
        _jwtOptions = jwtOptions.Value;
        _activity = activity;
        _security = security;
        _platform = platform;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        if (!(await _platform.GetStatusAsync(ct)).SignupsEnabled)
            throw new ForbiddenException("New sign-ups are currently closed.");

        var email = request.Email.Trim().ToLowerInvariant();
        PasswordPolicy.Validate(request.Password, email);

        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException("An account with this email already exists.");

        var freePlan = await _db.Plans.FirstOrDefaultAsync(p => p.Code == PlanId.Free, ct)
            ?? throw new AppException("Plans have not been seeded yet.", StatusCodes.Status500InternalServerError);

        var user = new User
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = _hasher.Hash(request.Password),
            Role = MemberRole.Owner, // owns their own account/resources by default
            PlanId = freePlan.Id,
            LastLoginAt = DateTimeOffset.UtcNow,
        };
        _db.Users.Add(user);

        _db.Subscriptions.Add(new Subscription { UserId = user.Id, PlanId = freePlan.Id, Status = SubscriptionStatus.Active, IsMock = true });
        _db.UserSettings.Add(new UserSettings { UserId = user.Id });
        _db.Workspaces.Add(new Workspace { Name = "Personal", OwnerId = user.Id, IsPersonal = true });

        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(user.Id, null, ActivityAction.UserRegistered, "User", user.Id.ToString(), ct: ct);
        await _account.SendVerificationAfterRegisterAsync(user, ct);

        return await IssueTokensAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.Include(u => u.Plan).FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null || !_hasher.Verify(request.Password, user.PasswordHash))
        {
            await _security.RecordAsync("login_failed", email, "/api/auth/login", user is null ? "Unknown email" : "Wrong password");
            throw new UnauthorizedAppException("Invalid email or password.");
        }

        if (user.IsSuspended)
        {
            await _security.RecordAsync("login_suspended", email, "/api/auth/login", "Sign-in attempt on a suspended account");
            throw new ForbiddenException("This account has been suspended. Contact support.");
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(user.Id, null, ActivityAction.Login, "User", user.Id.ToString(), ct: ct);

        return await IssueTokensAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(string refreshTokenRaw, CancellationToken ct)
    {
        var hash = _jwt.HashRefreshToken(refreshTokenRaw);
        var stored = await _db.RefreshTokens.Include(t => t.User).ThenInclude(u => u!.Plan)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored?.User is not null && stored.RevokedAt is { } revokedAt && stored.ExpiresAt > DateTimeOffset.UtcNow
            && DateTimeOffset.UtcNow - revokedAt > ReuseGrace)
        {
            // A token that was already rotated (or logged out) is being replayed well after the fact:
            // either it was stolen or a client is badly out of sync. End every session for the account
            // so the thief's copy of the newest token dies too. The short grace window covers two tabs
            // refreshing at the same moment.
            foreach (var t in await _db.RefreshTokens.Where(t => t.UserId == stored.UserId && t.RevokedAt == null).ToListAsync(ct))
                t.RevokedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            await _security.RecordAsync("refresh_token_reuse", stored.User.Email, "/api/auth/refresh",
                "A revoked refresh token was replayed; all sessions for the account were ended");
        }

        if (stored is null || !stored.IsActive || stored.User is null)
            throw new UnauthorizedAppException("Refresh token is invalid or has expired.");

        if (stored.User.IsSuspended)
            throw new UnauthorizedAppException("This account has been suspended.");

        // Rotate: revoke the used token and issue a new pair, so a stolen refresh
        // token can only be replayed once before it stops working.
        stored.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return await IssueTokensAsync(stored.User, ct);
    }

    public async Task LogoutAsync(string refreshTokenRaw, CancellationToken ct)
    {
        var hash = _jwt.HashRefreshToken(refreshTokenRaw);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null) return; // logout is idempotent - an unknown/expired token is not an error

        stored.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<AuthResponse> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.Plan).FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("User not found.");

        if (!_hasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ValidationAppException("Current password is incorrect.");
        if (request.NewPassword == request.CurrentPassword)
            throw new ValidationAppException("Choose a password different from your current one.");
        PasswordPolicy.Validate(request.NewPassword, user.Email);

        var now = DateTimeOffset.UtcNow;
        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.UpdatedAt = now;

        // Anyone holding the old password (or a session made with it) must not stay signed in.
        foreach (var rt in await _db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null).ToListAsync(ct))
            rt.RevokedAt = now;
        await _db.SaveChangesAsync(ct);
        await _security.RecordAsync("password_changed", user.Email, "/api/users/me/password",
            "Password changed; other sessions ended");

        return await IssueTokensAsync(user, ct);
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken ct)
    {
        var access = _jwt.CreateAccessToken(user);
        var refreshRaw = _jwt.CreateRefreshTokenRaw();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwt.HashRefreshToken(refreshRaw),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays),
        });
        await _db.SaveChangesAsync(ct);

        var plan = user.Plan ?? await _db.Plans.FindAsync([user.PlanId], ct);

        return new AuthResponse(
            access.Value,
            access.ExpiresAt,
            refreshRaw,
            new UserProfileResponse(
                user.Id, user.Email, user.FullName, user.AvatarUrl, user.Role.ToString(),
                plan?.Code.ToString() ?? "Free", user.CreatedAt, user.UpdatedAt, user.LastLoginAt,
                user.EmailVerifiedAt is not null));
    }
}
