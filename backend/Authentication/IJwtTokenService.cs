using Backend.Models;

namespace Backend.Authentication;

public record AccessToken(string Value, DateTimeOffset ExpiresAt);

/// <summary>Issues and validates JWTs, and the raw (unhashed) refresh token strings the
/// database only ever stores a SHA-256 hash of.</summary>
public interface IJwtTokenService
{
    AccessToken CreateAccessToken(User user);

    /// <summary>A cryptographically random refresh token. Return it to the client once;
    /// only <see cref="HashRefreshToken"/> of it is persisted.</summary>
    string CreateRefreshTokenRaw();

    string HashRefreshToken(string raw);
}
