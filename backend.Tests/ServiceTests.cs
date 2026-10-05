using Backend.DTOs.Auth;
using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public class AccountServiceTests
{
    [Fact]
    public async Task ForgotPasswordForUnknownEmailSendsNothingAndDoesNotThrow()
    {
        using var db = TestSupport.NewDb();
        var mail = new RecordingEmailSender();
        await TestSupport.NewAccountService(db, mail).ForgotPasswordAsync("ghost@example.com", default);
        Assert.Empty(mail.Messages);
    }

    [Fact]
    public async Task ResetFlowChangesPasswordAndTokenIsSingleUse()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);

        await svc.ForgotPasswordAsync(user.Email, default);
        var token = mail.LastToken();
        Assert.NotNull(token);
        Assert.Contains("http://app.test/reset-password?token=", mail.Messages[0].Body);

        await svc.ResetPasswordAsync(token!, "Brand-New-Pass-77", default);
        Assert.True(new Backend.Authentication.PasswordHasher().Verify("Brand-New-Pass-77", (await db.Users.FirstAsync()).PasswordHash));

        await Assert.ThrowsAsync<ValidationAppException>(() => svc.ResetPasswordAsync(token!, "Another-Pass-88", default));
    }

    [Fact]
    public async Task OnlyTheTokenHashIsStored()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        await TestSupport.NewAccountService(db, mail).ForgotPasswordAsync(user.Email, default);

        var stored = await db.UserTokens.SingleAsync();
        Assert.DoesNotContain(mail.LastToken()!, stored.TokenHash);
        Assert.Equal(64, stored.TokenHash.Length); // SHA-256 hex
    }

    [Fact]
    public async Task ResetEndsEverySessionAndVerifiesTheEmail()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = "h1", ExpiresAt = DateTimeOffset.UtcNow.AddDays(1) });
        db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = "h2", ExpiresAt = DateTimeOffset.UtcNow.AddDays(1) });
        await db.SaveChangesAsync();

        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);
        await svc.ForgotPasswordAsync(user.Email, default);
        await svc.ResetPasswordAsync(mail.LastToken()!, "Brand-New-Pass-77", default);

        Assert.All(await db.RefreshTokens.ToListAsync(), t => Assert.NotNull(t.RevokedAt));
        Assert.NotNull((await db.Users.FirstAsync()).EmailVerifiedAt);
    }

    [Fact]
    public async Task ExpiredTokenIsRefused()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);
        await svc.ForgotPasswordAsync(user.Email, default);

        var t = await db.UserTokens.SingleAsync();
        t.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<ValidationAppException>(() => svc.ResetPasswordAsync(mail.LastToken()!, "Brand-New-Pass-77", default));
    }

    [Fact]
    public async Task ResetRefusesWeakPasswordsAndKeepsTheTokenUsable()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);
        await svc.ForgotPasswordAsync(user.Email, default);

        await Assert.ThrowsAsync<ValidationAppException>(() => svc.ResetPasswordAsync(mail.LastToken()!, "password123", default));
        await svc.ResetPasswordAsync(mail.LastToken()!, "Brand-New-Pass-77", default); // same link still works
    }

    [Fact]
    public async Task SecondForgotRequestInsideTheCooldownSendsNothing()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);
        await svc.ForgotPasswordAsync(user.Email, default);
        await svc.ForgotPasswordAsync(user.Email, default);
        Assert.Single(mail.Messages);
    }

    [Fact]
    public async Task NewResetLinkRetiresTheOldOne()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);
        await svc.ForgotPasswordAsync(user.Email, default);
        var first = mail.LastToken()!;

        // Move the first request out of the cooldown window, then ask again.
        var t = await db.UserTokens.SingleAsync();
        t.CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        await db.SaveChangesAsync();
        await svc.ForgotPasswordAsync(user.Email, default);

        await Assert.ThrowsAsync<ValidationAppException>(() => svc.ResetPasswordAsync(first, "Brand-New-Pass-77", default));
        await svc.ResetPasswordAsync(mail.LastToken()!, "Brand-New-Pass-77", default);
    }

    [Fact]
    public async Task VerifyEmailMarksTheUserAndConsumesTheToken()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);

        await svc.ResendVerificationAsync(user.Id, default);
        Assert.Contains("/verify-email?token=", mail.Messages[0].Body);
        var token = mail.LastToken()!;

        await svc.VerifyEmailAsync(token, default);
        Assert.NotNull((await db.Users.FirstAsync()).EmailVerifiedAt);
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.VerifyEmailAsync(token, default));
        await Assert.ThrowsAsync<ConflictException>(() => svc.ResendVerificationAsync(user.Id, default));
    }

    [Fact]
    public async Task AResetTokenCannotVerifyAnEmailAndViceVersa()
    {
        using var db = TestSupport.NewDb();
        var user = TestSupport.AddUser(db);
        var mail = new RecordingEmailSender();
        var svc = TestSupport.NewAccountService(db, mail);
        await svc.ForgotPasswordAsync(user.Email, default);
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.VerifyEmailAsync(mail.LastToken()!, default));
    }
}

public class AuthServiceTests
{
    private static async Task<(Backend.Data.AppDbContext db, AuthService svc, AuthResponse first)> SignedUp(RecordingSecurityEvents? ev = null)
    {
        var db = TestSupport.NewDb();
        TestSupport.AddPlan(db);
        var svc = TestSupport.NewAuthService(db, ev);
        var res = await svc.RegisterAsync(new RegisterRequest("Jane Doe", "jane@example.com", "Correct-Horse-9"), default);
        return (db, svc, res);
    }

    [Fact]
    public async Task RegisterRefusesCommonPasswords()
    {
        using var db = TestSupport.NewDb();
        TestSupport.AddPlan(db);
        var svc = TestSupport.NewAuthService(db);
        await Assert.ThrowsAsync<ValidationAppException>(() =>
            svc.RegisterAsync(new RegisterRequest("Jane Doe", "jane@example.com", "password123"), default));
    }

    [Fact]
    public async Task RefreshRotatesAndReusingTheOldTokenIsRejected()
    {
        var (db, svc, first) = await SignedUp();
        using var _ = db;
        var second = await svc.RefreshAsync(first.RefreshToken, default);
        Assert.NotEqual(first.RefreshToken, second.RefreshToken);
        await Assert.ThrowsAsync<UnauthorizedAppException>(() => svc.RefreshAsync(first.RefreshToken, default));
    }

    [Fact]
    public async Task ReplayingARevokedTokenLaterEndsEverySession()
    {
        var events = new RecordingSecurityEvents();
        var (db, svc, first) = await SignedUp(events);
        using var _ = db;
        var second = await svc.RefreshAsync(first.RefreshToken, default); // rotates; `first` is now revoked

        // The thief replays the old token well after the grace window.
        foreach (var t in await db.RefreshTokens.Where(t => t.RevokedAt != null).ToListAsync())
            t.RevokedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAppException>(() => svc.RefreshAsync(first.RefreshToken, default));
        // ...and the legitimate newest token no longer works either.
        await Assert.ThrowsAsync<UnauthorizedAppException>(() => svc.RefreshAsync(second.RefreshToken, default));
        Assert.Contains("refresh_token_reuse", events.Types);
    }

    [Fact]
    public async Task TwoTabsRefreshingAtOnceDoNotKillTheSession()
    {
        var events = new RecordingSecurityEvents();
        var (db, svc, first) = await SignedUp(events);
        using var _ = db;
        await svc.RefreshAsync(first.RefreshToken, default);
        // Immediate second use (within the grace window) is rejected but is not treated as theft.
        await Assert.ThrowsAsync<UnauthorizedAppException>(() => svc.RefreshAsync(first.RefreshToken, default));
        Assert.DoesNotContain("refresh_token_reuse", events.Types);
        Assert.Contains(await db.RefreshTokens.ToListAsync(), t => t.RevokedAt is null); // newest token survives
    }

    [Fact]
    public async Task ChangePasswordEndsOtherSessionsButReturnsAFreshOne()
    {
        var (db, svc, first) = await SignedUp();
        using var _ = db;
        var uid = first.User.Id;

        var fresh = await svc.ChangePasswordAsync(uid, new ChangePasswordRequest("Correct-Horse-9", "Even-Better-Pass-5"), default);

        await Assert.ThrowsAsync<UnauthorizedAppException>(() => svc.RefreshAsync(first.RefreshToken, default));
        var again = await svc.RefreshAsync(fresh.RefreshToken, default); // the returned session is valid
        Assert.NotNull(again.AccessToken);
        await svc.LoginAsync(new LoginRequest("jane@example.com", "Even-Better-Pass-5"), default);
        await Assert.ThrowsAsync<UnauthorizedAppException>(() =>
            svc.LoginAsync(new LoginRequest("jane@example.com", "Correct-Horse-9"), default));
    }

    [Fact]
    public async Task ChangePasswordValidatesCurrentNewAndPolicy()
    {
        var (db, svc, first) = await SignedUp();
        using var _ = db;
        var uid = first.User.Id;
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.ChangePasswordAsync(uid, new ChangePasswordRequest("wrong-current", "Even-Better-Pass-5"), default));
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.ChangePasswordAsync(uid, new ChangePasswordRequest("Correct-Horse-9", "Correct-Horse-9"), default));
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.ChangePasswordAsync(uid, new ChangePasswordRequest("Correct-Horse-9", "password123"), default));
    }
}

public class PlanLimitTests
{
    private static (Backend.Data.AppDbContext db, PlanLimitService svc, User user, KnowledgeBase kb) Setup(int maxChunks)
    {
        var db = TestSupport.NewDb();
        var plan = TestSupport.AddPlan(db, maxChunks: maxChunks);
        var user = TestSupport.AddUser(db, plan: plan);
        var kb = new KnowledgeBase { OwnerId = user.Id, Name = "kb" };
        db.KnowledgeBases.Add(kb);
        db.SaveChanges();
        return (db, new PlanLimitService(db), user, kb);
    }

    [Fact]
    public async Task ChunkLimitIsEnforcedAcrossDocuments()
    {
        var (db, svc, user, kb) = Setup(maxChunks: 1000);
        using var _ = db;
        db.Documents.Add(new Document { KnowledgeBaseId = kb.Id, UploadedBy = user.Id, FileName = "a.pdf", ChunkCount = 800, Status = DocumentStatus.Completed });
        await db.SaveChangesAsync();

        await svc.EnsureChunksWithinLimitAsync(user.Id, Guid.NewGuid(), 200, default);          // exactly at the limit
        await Assert.ThrowsAsync<PlanLimitExceededException>(() =>
            svc.EnsureChunksWithinLimitAsync(user.Id, Guid.NewGuid(), 201, default));            // one over
    }

    [Fact]
    public async Task ReprocessingADocumentDoesNotCountItsOwnOldChunks()
    {
        var (db, svc, user, kb) = Setup(maxChunks: 1000);
        using var _ = db;
        var doc = new Document { KnowledgeBaseId = kb.Id, UploadedBy = user.Id, FileName = "a.pdf", ChunkCount = 900, Status = DocumentStatus.Completed };
        db.Documents.Add(doc);
        await db.SaveChangesAsync();

        await svc.EnsureChunksWithinLimitAsync(user.Id, doc.Id, 950, default);
    }

    [Fact]
    public async Task FailedDocumentsDoNotUseUpTheDocumentQuota()
    {
        var (db, svc, user, kb) = Setup(maxChunks: 5000); // plan allows 3 documents
        using var _ = db;
        for (var i = 0; i < 3; i++)
            db.Documents.Add(new Document { KnowledgeBaseId = kb.Id, UploadedBy = user.Id, FileName = $"bad{i}.pdf", FileSize = 10, Status = DocumentStatus.Failed });
        await db.SaveChangesAsync();

        await svc.EnsureCanUploadDocumentAsync(user.Id, 10, default);
        Assert.Equal(0, (await svc.GetUsageSummaryAsync(user.Id, default)).Documents);
    }

    [Fact]
    public async Task CompletedDocumentsStillCountAndTheLimitHolds()
    {
        var (db, svc, user, kb) = Setup(maxChunks: 5000);
        using var _ = db;
        for (var i = 0; i < 3; i++)
            db.Documents.Add(new Document { KnowledgeBaseId = kb.Id, UploadedBy = user.Id, FileName = $"ok{i}.pdf", FileSize = 10, Status = DocumentStatus.Completed });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<PlanLimitExceededException>(() => svc.EnsureCanUploadDocumentAsync(user.Id, 10, default));
    }
}
