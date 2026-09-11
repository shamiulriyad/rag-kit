using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.KnowledgeBases;

/// <summary>Shaped to match frontend/src/lib/appData.ts's <c>KnowledgeBase</c> interface
/// (id, name, description, documents, chunks, updatedAt) plus the caller's role.</summary>
public record KnowledgeBaseResponse(
    Guid Id, string Name, string Description,
    int Documents, int Chunks,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    string Role);

public record KnowledgeBaseStatsResponse(
    Guid Id, int DocumentCount, int ChunkCount,
    int CompletedDocuments, int ProcessingDocuments, int FailedDocuments,
    long StorageBytes);

public record CreateKnowledgeBaseRequest(
    [property: Required, MinLength(2), MaxLength(200)] string Name,
    [property: MaxLength(2000)] string? Description,
    Guid? WorkspaceId);

public record UpdateKnowledgeBaseRequest(
    [property: MinLength(2), MaxLength(200)] string? Name,
    [property: MaxLength(2000)] string? Description);

public record KnowledgeBaseMemberResponse(
    Guid Id, Guid UserId, string Email, string FullName, string Role, DateTimeOffset CreatedAt);

public record AddKnowledgeBaseMemberRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required] string Role);

public record UpdateKnowledgeBaseMemberRequest([property: Required] string Role);
