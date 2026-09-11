using System.Text.Json.Serialization;

namespace Backend.Integrations.PythonRag;

// Wire format for the Python RAG service only - never returned directly from a controller.
// Controllers/services work with DTOs/domain models; RagService.cs is the one place that
// translates between the two (snake_case <-> PascalCase, per docs/architecture.md).

public record RagIngestResult(
    [property: JsonPropertyName("pages")] int Pages,
    [property: JsonPropertyName("chunks")] int Chunks);

public record RagQuerySource(
    [property: JsonPropertyName("document_id")] string? DocumentId,
    [property: JsonPropertyName("chunk_id")] string? ChunkId,
    [property: JsonPropertyName("page")] int? Page,
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("score")] double Score,
    [property: JsonPropertyName("excerpt")] string Excerpt);

public record RagQueryResult(
    [property: JsonPropertyName("answer")] string Answer,
    [property: JsonPropertyName("sources")] List<RagQuerySource> Sources);
