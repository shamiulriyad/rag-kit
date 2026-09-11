using Backend.DTOs.Teams;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/workspaces")]
[Tags("Teams")]
[Authorize]
public class WorkspacesController : ApiControllerBase
{
    private readonly IWorkspaceService _workspaces;

    public WorkspacesController(IWorkspaceService workspaces) => _workspaces = workspaces;

    [HttpGet]
    public async Task<ActionResult> List(CancellationToken ct) => Success(await _workspaces.ListAsync(CurrentUserId, ct));

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateWorkspaceRequest request, CancellationToken ct) =>
        Success(await _workspaces.CreateAsync(CurrentUserId, request, ct), "Workspace created.");

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct) => Success(await _workspaces.GetAsync(id, CurrentUserId, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateWorkspaceRequest request, CancellationToken ct) =>
        Success(await _workspaces.UpdateAsync(id, CurrentUserId, request, ct), "Workspace updated.");

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _workspaces.DeleteAsync(id, CurrentUserId, ct);
        return Success("Workspace deleted.");
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult> Members(Guid id, CancellationToken ct) => Success(await _workspaces.ListMembersAsync(id, CurrentUserId, ct));

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult> Invite(Guid id, [FromBody] InviteWorkspaceMemberRequest request, CancellationToken ct) =>
        Success(await _workspaces.InviteAsync(id, CurrentUserId, request, ct), "Invitation sent (mocked - no email is delivered yet).");

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await _workspaces.RemoveMemberAsync(id, userId, CurrentUserId, ct);
        return Success("Member removed.");
    }
}
