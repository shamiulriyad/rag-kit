using System.ComponentModel.DataAnnotations;
using Backend.Authorization;
using Backend.DTOs.Auth;
using Backend.DTOs.Chat;
using Backend.DTOs.Common;
using Backend.Helpers;
using Backend.Models;

namespace Backend.Tests;

public class KnowledgeBaseAccessTests
{
    private static readonly Guid Owner = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    private static KnowledgeBase Kb(Workspace? ws = null, params KnowledgeBaseMember[] members) =>
        new() { OwnerId = Owner, Workspace = ws, WorkspaceId = ws?.Id, Members = members.ToList() };

    private static Workspace TeamWs(Guid owner, params (Guid user, MemberRole role)[] members) =>
        new()
        {
            OwnerId = owner, IsPersonal = false,
            Members = members.Select(m => new WorkspaceMember { UserId = m.user, Role = m.role }).ToList(),
        };

    [Fact]
    public void KbOwnerIsOwner() => Assert.Equal(MemberRole.Owner, KnowledgeBaseAccess.RoleOf(Kb(), Owner));

    [Fact]
    public void StrangerHasNoAccess() => Assert.Null(KnowledgeBaseAccess.RoleOf(Kb(), Other));

    [Fact]
    public void DirectKbMemberKeepsTheirRole()
    {
        var kb = Kb(null, new KnowledgeBaseMember { UserId = Other, Role = MemberRole.Admin });
        Assert.Equal(MemberRole.Admin, KnowledgeBaseAccess.RoleOf(kb, Other));
    }

    [Theory]
    [InlineData(MemberRole.Member)]
    [InlineData(MemberRole.Admin)]
    public void TeamWorkspaceMembersGetTheirWorkspaceRoleOnItsKbs(MemberRole role)
    {
        var kb = Kb(TeamWs(Owner, (Other, role)));
        Assert.Equal(role, KnowledgeBaseAccess.RoleOf(kb, Other));
    }

    [Fact]
    public void WorkspaceOwnerOwnsKbsCreatedByOthers()
    {
        var wsOwner = Guid.NewGuid();
        var kb = Kb(TeamWs(wsOwner)); // KB made by Owner, workspace owned by wsOwner
        Assert.Equal(MemberRole.Owner, KnowledgeBaseAccess.RoleOf(kb, wsOwner));
    }

    [Fact]
    public void StrongestRoleWins()
    {
        var kb = Kb(TeamWs(Guid.NewGuid(), (Other, MemberRole.Admin)),
            new KnowledgeBaseMember { UserId = Other, Role = MemberRole.Member });
        Assert.Equal(MemberRole.Admin, KnowledgeBaseAccess.RoleOf(kb, Other));
    }

    [Fact]
    public void PersonalWorkspaceNeverWidensAccess()
    {
        var ws = new Workspace { OwnerId = Owner, IsPersonal = true, Members = [new WorkspaceMember { UserId = Other, Role = MemberRole.Admin }] };
        Assert.Null(KnowledgeBaseAccess.RoleOf(Kb(ws), Other));
    }

    [Fact]
    public void PendingInviteWithoutUserGivesNoAccess()
    {
        var ws = new Workspace { OwnerId = Owner, IsPersonal = false, Members = [new WorkspaceMember { UserId = null, InviteEmail = "x@y.z", Role = MemberRole.Admin }] };
        Assert.Null(KnowledgeBaseAccess.RoleOf(Kb(ws), Other));
    }
}

public class PasswordPolicyTests
{
    [Theory]
    [InlineData("password")]
    [InlineData("Password123")]
    [InlineData("12345678")]
    [InlineData("qwertyuiop")]
    [InlineData("aaaaaaaaaa")]
    [InlineData("abababab")]
    [InlineData("abcdefghij")]
    [InlineData("987654321")]
    public void RejectsWeakPasswords(string pw) => Assert.Throws<ValidationAppException>(() => PasswordPolicy.Validate(pw));

    [Fact]
    public void RejectsEmailAsPassword() =>
        Assert.Throws<ValidationAppException>(() => PasswordPolicy.Validate("jane.doe@example.com", "jane.doe@example.com"));

    [Fact]
    public void RejectsEmailLocalPartAsPassword() =>
        Assert.Throws<ValidationAppException>(() => PasswordPolicy.Validate("janedoe99", "janedoe99@example.com"));

    [Theory]
    [InlineData("Correct-Horse-9")]
    [InlineData("tr0ub4dor&3-xyz")]
    [InlineData("purple monkey dishwasher")]
    public void AcceptsReasonablePasswords(string pw) => PasswordPolicy.Validate(pw, "someone@example.com");
}

public class ValidationTests
{
    /// <summary>Validates a positional record the way ASP.NET model binding does: by running the
    /// validation attributes that sit on its constructor parameters.</summary>
    private static List<string> Errors(object model)
    {
        var type = model.GetType();
        var ctor = type.GetConstructors().Single();
        var errors = new List<string>();
        foreach (var p in ctor.GetParameters())
        {
            var value = type.GetProperty(p.Name!, System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase)!.GetValue(model);
            foreach (var attr in p.GetCustomAttributes(typeof(ValidationAttribute), true).Cast<ValidationAttribute>())
                if (!attr.IsValid(value)) errors.Add($"{p.Name}: {attr.GetType().Name}");
        }
        return errors;
    }

    [Theory]
    [InlineData("https://example.com/a.png", true)]
    [InlineData("http://example.com/a.png", true)]
    [InlineData("", true)]
    [InlineData(null, true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("data:text/html,<script>1</script>", false)]
    [InlineData("ftp://example.com/x", false)]
    [InlineData("//example.com/x", false)]
    [InlineData("not a url", false)]
    public void HttpUrlAcceptsOnlyWebUrls(string? value, bool expected) =>
        Assert.Equal(expected, new HttpUrlAttribute().IsValid(value));

    [Fact]
    public void HttpUrlRejectsOverlongUrls() =>
        Assert.False(new HttpUrlAttribute().IsValid("https://example.com/" + new string('a', 2100)));

    [Fact]
    public void RegisterRejectsOversizedFields()
    {
        Assert.NotEmpty(Errors(new RegisterRequest(new string('x', 101), "a@b.co", "Correct-Horse-9")));
        Assert.NotEmpty(Errors(new RegisterRequest("Ok Name", new string('x', 250) + "@example.com", "Correct-Horse-9")));
        Assert.NotEmpty(Errors(new RegisterRequest("Ok Name", "a@b.co", new string('p', 129))));
        Assert.Empty(Errors(new RegisterRequest("Ok Name", "a@b.co", "Correct-Horse-9")));
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(20, true)]
    [InlineData(21, false)]
    [InlineData(1000, false)]
    public void AskRequestBoundsTopK(int topK, bool ok) =>
        Assert.Equal(ok, Errors(new AskMessageRequest("hello", topK)).Count == 0);

    [Fact]
    public void AskRequestBoundsQuestionLength()
    {
        Assert.Empty(Errors(new AskMessageRequest(new string('q', 4000), null)));
        Assert.NotEmpty(Errors(new AskMessageRequest(new string('q', 4001), null)));
    }
}

public class PageQueryTests
{
    [Fact]
    public void DefaultsToFirstBoundedPage()
    {
        var p = PageQuery.From(null, null);
        Assert.Equal(1, p.Page);
        Assert.Equal(PageQuery.DefaultSize, p.PageSize);
        Assert.Equal(0, p.Skip);
    }

    [Theory]
    [InlineData(-5, 0, 1, 1)]
    [InlineData(3, 50, 3, 50)]
    [InlineData(2, 99999, 2, PageQuery.MaxSize)]
    public void ClampsHostileInput(int page, int size, int expectedPage, int expectedSize)
    {
        var p = PageQuery.From(page, size);
        Assert.Equal(expectedPage, p.Page);
        Assert.Equal(expectedSize, p.PageSize);
    }

    [Fact]
    public void SkipMatchesPage() => Assert.Equal(100, PageQuery.From(3, 50).Skip);
}
