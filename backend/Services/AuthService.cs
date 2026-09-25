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

    public AuthService(
        AppDbContext db,
        IPasswordHasher hasher,
        IJwtTokenService jwt,
        Microsoft.Extensions.Options.IOptions<JwtOptions> jwtOptions,
        IActivityLogService activity,
        ISecurityEventService security,
        IPlatformSettingsService platform)
    {
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
                plan?.Code.ToString() ?? "Free", user.CreatedAt, user.UpdatedAt, user.LastLoginAt));
    }
}
