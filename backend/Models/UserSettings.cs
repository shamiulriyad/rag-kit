namespace Backend.Models;

/// <summary>Per-user RAG/UI preferences (spec section 21). These drive default
/// chunking/retrieval parameters for new documents/questions - never secrets.</summary>
public class UserSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Theme { get; set; } = "dark";
    public string DefaultModel { get; set; } = "gemini-2.5-flash";
    public string EmbeddingModel { get; set; } = "gemini-embedding-001";

    public int ChunkSize { get; set; } = 1000;
    public int ChunkOverlap { get; set; } = 150;
    public int TopK { get; set; } = 4;

    /// <summary>Off by default (0 = no filtering, top_k alone bounds results). Cosine
    /// similarity scores from retrieval are not a fixed, well-known scale - they vary by
    /// embedding model and content, so a nonzero default here silently drops good matches
    /// more often than it filters bad ones. Raise it deliberately per Knowledge Base once
    /// you've seen your own score distribution (see rag/main.py's retrieved-chunk logs).</summary>
    public double SimilarityThreshold { get; set; } = 0;

    public double Temperature { get; set; } = 0.2;
}
