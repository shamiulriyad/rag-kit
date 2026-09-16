namespace Backend.Models;

/// <summary>Role a user holds within a Knowledge Base, Workspace, or globally.
/// Stored as text (see AppDbContext) so the database stays human-readable.</summary>
public enum MemberRole
{
    Owner,
    Admin,
    Member,
}

/// <summary>Lifecycle of an uploaded document as it moves through the Python RAG pipeline.
/// Queued/Processing/Completed/Failed is also reused by <see cref="DocumentProcessingJob"/>
/// to track individual processing attempts.</summary>
public enum DocumentStatus
{
    Uploading,
    Queued,
    Processing,
    Completed,
    Failed,
}

/// <summary>Lifecycle of a <see cref="Subscription"/>. Payment processing is not implemented
/// yet (see BillingService) - this only tracks state a real payment provider will drive later.</summary>
public enum SubscriptionStatus
{
    Trial,
    Active,
    PastDue,
    Canceled,
    Expired,
}

/// <summary>Who authored a chat message.</summary>
public enum ChatRole
{
    User,
    Assistant,
}

/// <summary>Which plan tier an account is on. Limits live in <see cref="Plan"/>, not here.</summary>
public enum PlanId
{
    Free,
    Pro,
    Team,
}

/// <summary>Mirrors the frontend's <c>NotificationType</c> union in
/// frontend/src/lib/appData.ts - keep these two in sync.</summary>
public enum NotificationType
{
    DocReady,
    DocFailed,
    KbCreated,
    UsageWarning,
    PlanReminder,
    TeamActivity,
}

/// <summary>Event kinds recorded in the activity log (spec section 19 / 20).</summary>
public static class ActivityAction
{
    public const string UserRegistered = "USER_REGISTERED";
    public const string Login = "LOGIN";
    public const string KnowledgeBaseCreated = "KNOWLEDGE_BASE_CREATED";
    public const string KnowledgeBaseDeleted = "KNOWLEDGE_BASE_DELETED";
    public const string DocumentUploaded = "DOCUMENT_UPLOADED";
    public const string DocumentProcessed = "DOCUMENT_PROCESSED";
    public const string DocumentFailed = "DOCUMENT_FAILED";
    public const string DocumentDeleted = "DOCUMENT_DELETED";
    public const string ChatStarted = "CHAT_STARTED";
    public const string QuestionAsked = "QUESTION_ASKED";
    public const string SettingsUpdated = "SETTINGS_UPDATED";
    public const string MemberInvited = "MEMBER_INVITED";
    public const string MemberRemoved = "MEMBER_REMOVED";
    public const string PlanChanged = "PLAN_CHANGED";
}
