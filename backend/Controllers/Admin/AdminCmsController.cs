using Backend.DTOs.Admin;
using Backend.Services.Admin;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Admin;

[Tags("Admin - CMS")]
[Route("api/admin/cms")]
public class AdminCmsController(IAdminCmsService cms) : AdminControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List(
        [FromQuery] string? type, [FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct) =>
        Success(await cms.ListAsync(type, status, search, page, pageSize is > 0 ? pageSize : 20, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await cms.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] AdminCmsSaveRequest request, CancellationToken ct) =>
        Success(await cms.CreateAsync(request, ct), "Draft created.");

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] AdminCmsSaveRequest request, CancellationToken ct) =>
        Success(await cms.UpdateAsync(id, request, ct), "Saved.");

    [HttpPost("{id:guid}/publish")]
    public async Task<ActionResult> Publish(Guid id, CancellationToken ct)
    {
        await cms.SetPublishedAsync(id, true, ct);
        return Success("Published.");
    }

    [HttpPost("{id:guid}/unpublish")]
    public async Task<ActionResult> Unpublish(Guid id, CancellationToken ct)
    {
        await cms.SetPublishedAsync(id, false, ct);
        return Success("Unpublished.");
    }

    [HttpPost("{id:guid}/restore/{version:int}")]
    public async Task<ActionResult> Restore(Guid id, int version, CancellationToken ct) =>
        Success(await cms.RestoreAsync(id, version, ct), "Version restored.");
}
