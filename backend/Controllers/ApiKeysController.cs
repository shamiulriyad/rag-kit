using Backend.DTOs.ApiKeys;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route("api/api-keys")]
[Tags("Users")]
[Authorize]
public class ApiKeysController : ApiControllerBase
{
    private readonly IApiKeyService _keys;

    public ApiKeysController(IApiKeyService keys) => _keys = keys;

    [HttpGet]
    public async Task<ActionResult> List(CancellationToken ct) => Success(await _keys.ListAsync(CurrentUserId, ct));

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateApiKeyRequest request, CancellationToken ct) =>
        Success(await _keys.CreateAsync(CurrentUserId, request, ct), "API key created - copy it now, it will not be shown again.");

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Revoke(Guid id, CancellationToken ct)
    {
        await _keys.RevokeAsync(id, CurrentUserId, ct);
        return Success("API key revoked.");
    }
}
