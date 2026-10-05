using Backend.Data;
using Backend.DTOs.Auth;
using Backend.Helpers;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IUserService
{
    Task<UserProfileResponse> GetMeAsync(Guid userId, CancellationToken ct);
    Task<UserProfileResponse> UpdateMeAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct);
}

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<UserProfileResponse> GetMeAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.Plan).FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");
        return Map(user);
    }

    public async Task<UserProfileResponse> UpdateMeAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.Plan).FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");

        if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName.Trim();
        if (request.AvatarUrl is not null) user.AvatarUrl = request.AvatarUrl;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Map(user);
    }

    private static UserProfileResponse Map(Models.User user) => new(
        user.Id, user.Email, user.FullName, user.AvatarUrl, user.Role.ToString(),
        user.Plan?.Code.ToString() ?? "Free", user.CreatedAt, user.UpdatedAt, user.LastLoginAt,
        user.EmailVerifiedAt is not null);
}
