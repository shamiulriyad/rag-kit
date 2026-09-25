using System.ComponentModel.DataAnnotations;
using Backend.DTOs.Analytics;

namespace Backend.DTOs.Admin;

// ---- Access -------------------------------------------------------------------------------
public record AdminAccessResponse(bool IsAdmin, List<string> Permissions);

// ---- Dashboard ----------------------------------------------------------------------------
public record PlanCount(string Plan, int Users, decimal MonthlyPrice);
public record StatusCount(string Status, int Count);

public record AdminDashboardResponse(
    int Days,
    int TotalUsers, int NewUsers, int ActiveUsers, int SuspendedUsers,
    int Workspaces, int KnowledgeBases, int Documents, int Chunks, long StorageBytes,
    int Questions, int TotalQuestions,
    int FailedJobs, int PendingJobs,
    int PaidUsers, decimal EstimatedMrr,
    List<PlanCount> Plans, List<StatusCount> DocumentStatuses);

public record AdminTimeSeries(
    List<TimeSeriesPoint> Signups, List<TimeSeriesPoint> Questions,
    List<TimeSeriesPoint> DocumentsCompleted, List<TimeSeriesPoint> DocumentsFailed);

// ---- Users --------------------------------------------------------------------------------
public record AdminUserItem(
    Guid Id, string Email, string FullName, string Role, string Plan, int Workspaces,
    string Status, DateTimeOffset CreatedAt, DateTimeOffset? LastLoginAt);

public record AdminUserWorkspace(Guid Id, string Name, string Role, int Members);
public record AdminUserUsage(
    int KnowledgeBases, int Documents, int Chunks, long StorageBytes, int QuestionsTotal, int QuestionsThisMonth);
public record AdminUserActivity(string Action, string EntityType, DateTimeOffset CreatedAt);
public record AdminUserSecurity(int ActiveSessions, DateTimeOffset? LastLoginAt, bool IsSuspended, DateTimeOffset? SuspendedAt, string? SuspensionReason);

public record AdminUserDetail(
    Guid Id, string Email, string FullName, string Role, string Plan, string Status,
    DateTimeOffset CreatedAt, DateTimeOffset? LastLoginAt,
    List<AdminUserWorkspace> Workspaces, AdminUserUsage Usage,
    List<AdminUserActivity> Activity, AdminUserSecurity Security);

public record SuspendUserRequest([Required, MinLength(3), MaxLength(300)] string Reason);
public record AdminSetPlanRequest([Required] string PlanCode);

// ---- Workspaces / KBs / documents / invitations -------------------------------------------
public record AdminWorkspaceItem(
    Guid Id, string Name, Guid OwnerId, string OwnerEmail, int Members, int KnowledgeBases,
    int Documents, long StorageBytes, DateTimeOffset CreatedAt);

public record AdminWorkspaceMember(string Email, string Role, string Status);
public record AdminWorkspaceDetail(AdminWorkspaceItem Workspace, List<AdminWorkspaceMember> Members, List<AdminKnowledgeBaseItem> KnowledgeBases);

public record AdminKnowledgeBaseItem(
    Guid Id, string Name, string OwnerEmail, string? Workspace, int Documents, int Chunks, DateTimeOffset CreatedAt);

public record AdminDocumentItem(
    Guid Id, string FileName, string KnowledgeBase, string OwnerEmail, string Status, long FileSize,
    int? Chunks, string? Error, DateTimeOffset CreatedAt);

public record AdminInvitationItem(Guid Id, string Workspace, string Email, string Role, string Status, DateTimeOffset CreatedAt);

// ---- RAG jobs -----------------------------------------------------------------------------
public record AdminJobItem(
    Guid Id, Guid DocumentId, string Document, string Workspace, string Status, int Attempts, int MaxAttempts,
    double? DurationSeconds, string? Error, DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt);

public record JobStage(string Name, string State, DateTimeOffset? At);
public record JobLogEntry(DateTimeOffset At, string Message);
public record AdminJobDetail(
    AdminJobItem Job, Guid KnowledgeBaseId, string KnowledgeBase, string OwnerEmail, string DocumentStatus,
    List<JobStage> Stages, List<JobLogEntry> Log);

// ---- Health -------------------------------------------------------------------------------
public record ServiceHealth(string Id, string Name, string Status, long? ResponseMs, DateTimeOffset CheckedAt, string Detail);
public record AdminHealthResponse(List<ServiceHealth> Services, bool IncidentsTracked);

// ---- Business -----------------------------------------------------------------------------
public record AdminPlanItem(
    string Code, string Name, decimal PriceMonthly, decimal PriceYearly, int Users,
    int MaxDocuments, long MaxStorageBytes, int MaxQuestionsPerMonth, int MaxKnowledgeBases);

public record AdminSubscriptionItem(
    Guid Id, string UserEmail, string Plan, string Status, bool IsMock, DateTimeOffset StartedAt, DateTimeOffset? CurrentPeriodEnd);

// ---- Audit / search -----------------------------------------------------------------------
public record AdminAuditItem(
    Guid Id, DateTimeOffset At, string Actor, string Action, string ResourceType, string? ResourceId,
    string Result, string? Details);

public record AdminSearchHit(string Type, Guid Id, string Label, string? Sub);

// ---- Usage and cost -----------------------------------------------------------------------
public record AdminUsageMonth(string Month, int Questions, int Documents, long StorageBytes, int Chunks, int ActiveUsers);
public record AdminTopUsage(string Email, string Plan, int Questions, int Documents, long StorageBytes);

/// <summary>Everything here is an estimate. AiCostPerQuestion is null until configured.</summary>
public record AdminCostEstimate(decimal? AiCostPerQuestion, decimal? AiCostThisMonth, int PaidUsers, decimal EstimatedMonthlyRevenue);

public record AdminUsageResponse(List<AdminUsageMonth> Monthly, List<AdminTopUsage> TopUsers, AdminCostEstimate Estimate);

public record AdminBillingEventItem(
    Guid Id, DateTimeOffset At, string Type, string UserEmail, string Plan, decimal MonthlyPrice, string Source);

// ---- Security -----------------------------------------------------------------------------
public record AdminSecurityEventItem(
    Guid Id, DateTimeOffset At, string Type, string? Email, string? Ip, string? Path, string? Details);

public record AdminAdminUserItem(Guid Id, string Email, string FullName, string Role, string Status, DateTimeOffset? LastLoginAt);

public record AdminRoleItem(string Name, string Description, List<string> Permissions);

public record AdminApiKeyItem(
    Guid Id, string Name, string Prefix, string Owner, DateTimeOffset? LastUsedAt, DateTimeOffset? ExpiresAt,
    DateTimeOffset CreatedAt, string Status);

// ---- CMS ----------------------------------------------------------------------------------
public record AdminCmsItem(
    Guid Id, string Type, string Slug, string Title, string Status, int Version,
    string Author, string UpdatedBy, DateTimeOffset UpdatedAt, DateTimeOffset? PublishedAt);

public record AdminCmsVersionItem(int Version, string Title, string EditedBy, DateTimeOffset At);

public record AdminCmsDetail(
    Guid Id, string Type, string Slug, string Title, string Summary, string Body, string Status, int Version,
    string Author, string UpdatedBy, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, DateTimeOffset? PublishedAt,
    List<AdminCmsVersionItem> Versions);

public class AdminCmsSaveRequest
{
    [Required, MaxLength(30)] public string Type { get; set; } = string.Empty;
    [MaxLength(120)] public string? Slug { get; set; }
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(500)] public string? Summary { get; set; }
    [MaxLength(20000)] public string? Body { get; set; }
}
