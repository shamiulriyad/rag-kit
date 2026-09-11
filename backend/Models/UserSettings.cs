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
    public double SimilarityThreshold { get; set; } = 0.5;
    public double Temperature { get; set; } = 0.2;
}
