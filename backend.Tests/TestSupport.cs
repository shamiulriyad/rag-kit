using Backend.Authentication;
using Backend.Data;
using Backend.Integrations.Email;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Backend.Tests;

/// <summary>Shared fixtures: an isolated in-memory database per test and recording fakes for the
/// collaborators that would otherwise talk to the outside world.</summary>
internal static class TestSupport
{
    public static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    public static User AddUser(AppDbContext db, string email = "user@example.com", string password = "Correct-Horse-9", Plan? plan = null)
    {
        var user = new User
        {
            Email = email,
            FullName = "Test User",
            PasswordHash = new PasswordHasher().Hash(password),
            PlanId = plan?.Id,
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    public static Plan AddPlan(AppDbContext db, PlanId code = PlanId.Free, int maxChunks = 5000, int maxDocs = 3)
    {
        var plan = new Plan
        {
            Code = code, Name = code.ToString(), MaxChunks = maxChunks, MaxDocuments = maxDocs,
            MaxStorageBytes = 500L * 1024 * 1024, MaxKnowledgeBases = 5, MaxQuestionsPerMonth = 100,
        };
        db.Plans.Add(plan);
        db.SaveChanges();
        return plan;
    }

    public static JwtTokenService NewJwt() =>
        new(Options.Create(new JwtOptions { Secret = new string('k', 48) }),
            new AdminAccess(new ConfigurationBuilder().AddInMemoryCollection().Build()));

    public static IOptions<EmailOptions> EmailOpts() =>
        Options.Create(new EmailOptions { AppBaseUrl = "http://app.test" });

    public static AccountService NewAccountService(AppDbContext db, RecordingEmailSender email, RecordingSecurityEvents? events = null) =>
        new(db, new PasswordHasher(), email, EmailOpts(), events ?? new RecordingSecurityEvents(),
            NullLogger<AccountService>.Instance);

    public static AuthService NewAuthService(AppDbContext db, RecordingSecurityEvents? events = null, RecordingEmailSender? email = null)
    {
        var sender = email ?? new RecordingEmailSender();
        var ev = events ?? new RecordingSecurityEvents();
        return new AuthService(
            db, new PasswordHasher(), NewJwt(), Options.Create(new JwtOptions { Secret = new string('k', 48) }),
            new NoopActivityLog(), ev, new OpenPlatform(), NewAccountService(db, sender, ev));
    }
}

internal sealed class RecordingEmailSender : IEmailSender
{
    public record Sent(string To, string Subject, string Body);

    public List<Sent> Messages { get; } = [];
    public bool IsConfigured => true;

    public Task SendAsync(string to, string subject, string textBody, CancellationToken ct = default)
    {
        Messages.Add(new Sent(to, subject, textBody));
        return Task.CompletedTask;
    }

    /// <summary>The token from the most recent link in a message, or null.</summary>
    public string? LastToken()
    {
        var body = Messages.LastOrDefault()?.Body;
        var i = body?.IndexOf("token=", StringComparison.Ordinal) ?? -1;
        if (body is null || i < 0) return null;
        var rest = body[(i + "token=".Length)..];
        var end = rest.IndexOfAny(['\n', '\r', ' ']);
        return Uri.UnescapeDataString(end < 0 ? rest : rest[..end]);
    }
}

internal sealed class RecordingSecurityEvents : ISecurityEventService
{
    public List<string> Types { get; } = [];

    public Task RecordAsync(string type, string? email, string? path = null, string? details = null, string? ip = null)
    {
        Types.Add(type);
        return Task.CompletedTask;
    }
}

internal sealed class NoopActivityLog : IActivityLogService
{
    public Task LogAsync(Guid userId, Guid? workspaceId, string action, string entityType, string? entityId = null,
        object? metadata = null, CancellationToken ct = default) => Task.CompletedTask;

    public Task<List<ActivityLogResponse>> ListAsync(Guid userId, int limit, CancellationToken ct) =>
        Task.FromResult(new List<ActivityLogResponse>());

    public Task ClearAsync(Guid userId, CancellationToken ct) => Task.CompletedTask;
}

internal sealed class OpenPlatform : IPlatformSettingsService
{
    public Task<PlatformStatus> GetStatusAsync(CancellationToken ct = default) =>
        Task.FromResult(new PlatformStatus(false, "", true));

    public Task<PlatformSettings> GetAsync(CancellationToken ct = default) => Task.FromResult(new PlatformSettings());

    public Task<PlatformSettings> UpdateAsync(bool maintenance, string? message, bool signups, string updatedBy, CancellationToken ct = default) =>
        Task.FromResult(new PlatformSettings());
}
