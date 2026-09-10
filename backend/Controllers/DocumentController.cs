using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/documents")]
public class DocumentController : ControllerBase
{
    // Keep uploads sane; a bigger PDF is usually a scan that needs OCR anyway.
    private const long MaxBytes = 50L * 1024 * 1024;

    private readonly IRagService _rag;

    public DocumentController(IRagService rag) => _rag = rag;

    /// <summary>
    /// POST /api/documents/upload - stream a PDF through to the RAG service,
    /// which extracts, chunks, embeds and stores it in Qdrant.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(MaxBytes)]
    public async Task<ActionResult<DocumentResponse>> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "attach a PDF in the 'file' field" });

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "only .pdf files are supported" });

        await using var stream = file.OpenReadStream();
        var result = await _rag.IngestAsync(stream, Path.GetFileName(file.FileName), ct);
        return Ok(result);
    }
}
