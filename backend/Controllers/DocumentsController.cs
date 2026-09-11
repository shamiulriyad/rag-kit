using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/documents")]
[Tags("Documents")]
[Authorize]
public class DocumentsController : ApiControllerBase
{
    private readonly IDocumentService _documents;

    public DocumentsController(IDocumentService documents) => _documents = documents;

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await _documents.GetAsync(id, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _documents.DeleteAsync(id, CurrentUserId, ct);
        return Success("Document deleted.");
    }

    [HttpPost("{id:guid}/reprocess")]
    public async Task<ActionResult> Reprocess(Guid id, CancellationToken ct) =>
        Success(await _documents.ReprocessAsync(id, CurrentUserId, ct), "Reprocessing started.");
}
