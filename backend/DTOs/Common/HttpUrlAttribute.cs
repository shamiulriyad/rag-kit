using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Common;

/// <summary>Accepts null/empty or an absolute http(s) URL of at most 2048 characters. Rejects
/// javascript:, data: and other schemes so a stored value can never run script if it is rendered
/// into an href or src.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class HttpUrlAttribute : ValidationAttribute
{
    public HttpUrlAttribute() : base("Enter a valid http(s) URL (max 2048 characters).") { }

    public override bool IsValid(object? value)
    {
        if (value is null) return true;
        if (value is not string s || s.Length == 0) return value is string;
        return s.Length <= 2048
               && Uri.TryCreate(s, UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
