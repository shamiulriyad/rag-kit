using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/documents")]
public class DocumentController : ControllerBase
{
    private readonly IRagService _rag;

    public DocumentController(IRagService rag) => _rag = rag;

    /// <summary>
    /// POST /api/documents/upload - stream a PDF through to the RAG service,
    /// which extracts, chunks, embeds and stores it in Qdrant. The size ceiling
    /// is enforced globally by Kestrel / FormOptions (Upload:MaxBytes).
    /// </summary>
    [HttpPost("upload")]
    public async Task<ActionResult<DocumentResponse>> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, message = "Attach a PDF in the 'file' field." });

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { success = false, message = "Only .pdf files are supported." });

        // OpenReadStream() is buffered to disk by ASP.NET above ~64 KB, so the
        // whole PDF is never held in memory here.
        await using var stream = file.OpenReadStream();
        var result = await _rag.IngestAsync(stream, Path.GetFileName(file.FileName), ct);
        return Ok(result);
    }
}
