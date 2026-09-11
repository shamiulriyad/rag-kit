using Backend.Data;
using Backend.DTOs.Settings;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface ISettingsService
{
    Task<UserSettingsResponse> GetAsync(Guid userId, CancellationToken ct);
    Task<UserSettingsResponse> UpdateAsync(Guid userId, UpdateUserSettingsRequest request, CancellationToken ct);
}

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;
    private readonly IActivityLogService _activity;

    public SettingsService(AppDbContext db, IActivityLogService activity)
    {
        _db = db;
        _activity = activity;
    }

    public async Task<UserSettingsResponse> GetAsync(Guid userId, CancellationToken ct)
    {
        var settings = await GetOrCreateAsync(userId, ct);
        return Map(settings);
    }

    public async Task<UserSettingsResponse> UpdateAsync(Guid userId, UpdateUserSettingsRequest request, CancellationToken ct)
    {
        if (request.ChunkOverlap is int overlap && request.ChunkSize is int size && overlap >= size)
            throw new ValidationAppException("Chunk overlap must be smaller than chunk size.");

        var settings = await GetOrCreateAsync(userId, ct);

        if (!string.IsNullOrWhiteSpace(request.Theme)) settings.Theme = request.Theme;
        if (!string.IsNullOrWhiteSpace(request.DefaultModel)) settings.DefaultModel = request.DefaultModel;
        if (!string.IsNullOrWhiteSpace(request.EmbeddingModel)) settings.EmbeddingModel = request.EmbeddingModel;
        if (request.ChunkSize is int cs) settings.ChunkSize = cs;
        if (request.ChunkOverlap is int co) settings.ChunkOverlap = co;
        if (request.TopK is int tk) settings.TopK = tk;
        if (request.SimilarityThreshold is double st) settings.SimilarityThreshold = st;
        if (request.Temperature is double temp) settings.Temperature = temp;

        await _db.SaveChangesAsync(ct);
        await _activity.LogAsync(userId, null, ActivityAction.SettingsUpdated, "UserSettings", ct: ct);
        return Map(settings);
    }

    private async Task<UserSettings> GetOrCreateAsync(Guid userId, CancellationToken ct)
    {
        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (settings is not null) return settings;

        settings = new UserSettings { UserId = userId };
        _db.UserSettings.Add(settings);
        await _db.SaveChangesAsync(ct);
        return settings;
    }

    private static UserSettingsResponse Map(UserSettings s) => new(
        s.Theme, s.DefaultModel, s.EmbeddingModel, s.ChunkSize, s.ChunkOverlap, s.TopK, s.SimilarityThreshold, s.Temperature);
}
