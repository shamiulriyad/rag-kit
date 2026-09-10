namespace Backend.Configuration;

/// <summary>
/// Bound from the "Rag" section of appsettings.json (or environment variables
/// like <c>Rag__BaseUrl</c>). Tells the backend where the Python RAG service is.
/// </summary>
public class RagSettings
{
    /// <summary>Base URL of the Python RAG service (rag/main.py, run with uvicorn).</summary>
    public string BaseUrl { get; set; } = "http://localhost:8000";

    /// <summary>
    /// How long to wait for the Python service. Ingesting and embedding a large
    /// PDF can take minutes, so this is deliberately generous.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 600;
}
