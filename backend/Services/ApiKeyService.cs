using System.Security.Cryptography;
using System.Text;
using Backend.Data;
using Backend.DTOs.ApiKeys;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IApiKeyService
{
    Task<List<ApiKeyResponse>> ListAsync(Guid userId, CancellationToken ct);
    Task<ApiKeyCreatedResponse> CreateAsync(Guid userId, CreateApiKeyRequest request, CancellationToken ct);
    Task RevokeAsync(Guid id, Guid userId, CancellationToken ct);
}

/// <summary>Developer API keys for future programmatic access (spec section 23). The raw
/// key is generated here, shown once, and never stored - only its SHA-256 hash is.</summary>
public class ApiKeyService : IApiKeyService
{
    private const string Prefix = "rsk_live_";

    private readonly AppDbContext _db;

    public ApiKeyService(AppDbContext db) => _db = db;

    public async Task<List<ApiKeyResponse>> ListAsync(Guid userId, CancellationToken ct) =>
        await _db.ApiKeys.Where(k => k.UserId == userId && k.RevokedAt == null)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new ApiKeyResponse(k.Id, k.Name, k.Prefix, k.LastUsedAt, k.ExpiresAt, k.CreatedAt))
            .ToListAsync(ct);

    public async Task<ApiKeyCreatedResponse> CreateAsync(Guid userId, CreateApiKeyRequest request, CancellationToken ct)
    {
        var secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var raw = $"{Prefix}{secret}";
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

        var key = new ApiKey
        {
            UserId = userId,
            Name = request.Name.Trim(),
            KeyHash = hash,
            Prefix = raw[..Math.Min(raw.Length, 14)] + "…",
            ExpiresAt = request.ExpiresAt,
        };
        _db.ApiKeys.Add(key);
        await _db.SaveChangesAsync(ct);

        return new ApiKeyCreatedResponse(key.Id, key.Name, raw, key.CreatedAt);
    }

    public async Task RevokeAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var key = await _db.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId, ct)
            ?? throw new NotFoundException("API key not found.");
        key.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}
