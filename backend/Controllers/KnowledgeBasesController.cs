using Backend.DTOs.KnowledgeBases;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/knowledge-bases")]
[Tags("Knowledge Bases")]
[Authorize]
public class KnowledgeBasesController : ApiControllerBase
{
    private readonly IKnowledgeBaseService _kb;
    private readonly IDocumentService _documents;

    public KnowledgeBasesController(IKnowledgeBaseService kb, IDocumentService documents)
    {
        _kb = kb;
        _documents = documents;
    }

    [HttpGet]
    public async Task<ActionResult> List(CancellationToken ct) => Success(await _kb.ListAsync(CurrentUserId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await _kb.GetAsync(id, CurrentUserId, ct));

    [HttpGet("{id:guid}/stats")]
    public async Task<ActionResult> Stats(Guid id, CancellationToken ct) => Success(await _kb.GetStatsAsync(id, CurrentUserId, ct));

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateKnowledgeBaseRequest request, CancellationToken ct) =>
        Success(await _kb.CreateAsync(CurrentUserId, request, ct), "Knowledge Base created.");

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateKnowledgeBaseRequest request, CancellationToken ct) =>
        Success(await _kb.UpdateAsync(id, CurrentUserId, request, ct), "Knowledge Base updated.");

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _kb.DeleteAsync(id, CurrentUserId, ct);
        return Success("Knowledge Base deleted.");
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult> Members(Guid id, CancellationToken ct) => Success(await _kb.ListMembersAsync(id, CurrentUserId, ct));

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult> AddMember(Guid id, [FromBody] AddKnowledgeBaseMemberRequest request, CancellationToken ct) =>
        Success(await _kb.AddMemberAsync(id, CurrentUserId, request, ct), "Member added.");

    [HttpPut("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult> UpdateMember(Guid id, Guid userId, [FromBody] UpdateKnowledgeBaseMemberRequest request, CancellationToken ct) =>
        Success(await _kb.UpdateMemberAsync(id, userId, CurrentUserId, request, ct), "Member updated.");

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await _kb.RemoveMemberAsync(id, userId, CurrentUserId, ct);
        return Success("Member removed.");
    }

    [HttpGet("{id:guid}/documents")]
    public async Task<ActionResult> Documents(Guid id, CancellationToken ct) => Success(await _documents.ListAsync(id, CurrentUserId, ct));

    /// <summary>POST /api/knowledge-bases/{id}/documents - stream a PDF through to the RAG
    /// service. The size ceiling is enforced globally by Kestrel/FormOptions (Upload:MaxBytes).</summary>
    [HttpPost("{id:guid}/documents")]
    public async Task<ActionResult> Upload(Guid id, IFormFile file, CancellationToken ct) =>
        Success(await _documents.UploadAsync(id, CurrentUserId, file, ct), "Document uploaded and indexed.");
}
