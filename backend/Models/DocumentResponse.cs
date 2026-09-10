namespace Backend.Models;

/// <summary>What <c>POST /api/documents/upload</c> returns after indexing a PDF.</summary>
public class DocumentResponse
{
    /// <summary>The stored file name.</summary>
    public string Document { get; set; } = string.Empty;

    /// <summary>Pages kept after cleaning.</summary>
    public int Pages { get; set; }

    /// <summary>Chunks embedded and stored in Qdrant.</summary>
    public int Chunks { get; set; }

    /// <summary>True if the collection was rebuilt from scratch (the default).</summary>
    public bool Recreated { get; set; }
}
