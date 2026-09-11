namespace Backend.DTOs.Documents;

/// <summary>Shaped to match frontend/src/lib/mockData.ts's <c>DocRecord</c> interface
/// (id, name, sizeBytes, pages, chunks, status, uploadedAt, note).</summary>
public record DocumentResponse(
    Guid Id, Guid KnowledgeBaseId, string Name,
    long SizeBytes, string FileType,
    int? Pages, int? Chunks,
    string Status, string? Note,
    DateTimeOffset UploadedAt, DateTimeOffset? ProcessedAt);
