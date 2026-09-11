using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.ApiKeys;

public record ApiKeyResponse(Guid Id, string Name, string Prefix, DateTimeOffset? LastUsedAt, DateTimeOffset? ExpiresAt, DateTimeOffset CreatedAt);

/// <summary>Returned exactly once, at creation - the raw key is never retrievable again.</summary>
public record ApiKeyCreatedResponse(Guid Id, string Name, string RawKey, DateTimeOffset CreatedAt);

public record CreateApiKeyRequest(
    [property: Required, MinLength(2), MaxLength(100)] string Name,
    DateTimeOffset? ExpiresAt);
