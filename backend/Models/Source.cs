namespace Backend.Models;

/// <summary>One retrieved chunk, shown under the answer in the UI.</summary>
public class Source
{
    /// <summary>1-based page number in the PDF, if known.</summary>
    public int? Page { get; set; }

    /// <summary>File the chunk came from, e.g. "example.pdf".</summary>
    public string Document { get; set; } = "document";

    /// <summary>Similarity score from Qdrant (higher = closer).</summary>
    public double Score { get; set; }
}
