using System.Text;
using AspNetCoreRateLimit;
using Backend.Authentication;
using Backend.Authorization;
using Backend.Configuration;
using Backend.Data;
using Backend.Integrations.PythonRag;
using Backend.Integrations.Supabase;
using Backend.Middleware;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// Load backend/.env (if present) into process env vars before anything reads
// configuration - real env vars (Docker/CI/shell) always take precedence. Not
// needed for `docker compose up` (compose injects env vars directly) - this is
// for `dotnet run` without exporting everything by hand. See Helpers/EnvFile.cs.
Backend.Helpers.EnvFile.Load(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env"));
Backend.Helpers.EnvFile.Load(".env");

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Database - Postgres (Supabase-hosted in production; any Postgres works for
// local dev). Connection string: ConnectionStrings:Default, or
// DATABASE_CONNECTION_STRING / ConnectionStrings__Default env vars.
// ---------------------------------------------------------------------------
var connectionString = builder.Configuration["DATABASE_CONNECTION_STRING"]
    ?? builder.Configuration.GetConnectionString("Default");

if (string.IsNullOrWhiteSpace(connectionString))
{
    // Don't crash the whole container over a missing config value - start anyway so
    // /api/health reports "database: unhealthy" with a clear path to fix it, rather
    // than an opaque restart loop (spec: Clone -> Configure -> docker compose up).
    Console.Error.WriteLine(
        "[startup] WARNING: no database connection string configured " +
        "(DATABASE_CONNECTION_STRING / ConnectionStrings:Default). Set it in .env - see .env.example.");
    connectionString = "Host=unconfigured;Database=unconfigured;Username=unconfigured;Password=unconfigured";
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

// ---------------------------------------------------------------------------
// JWT auth
// ---------------------------------------------------------------------------
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Secret))
{
    // A per-process random secret keeps zero-config `docker compose up` working; it just
    // means every restart invalidates existing sessions. Set Jwt__Secret for anything
    // beyond a quick local trial (see .env.example).
    jwt.Secret = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
    Console.Error.WriteLine(
        "[startup] WARNING: Jwt:Secret is not configured - using a random secret for this " +
        "process only (all sessions are invalidated on restart). Set Jwt__Secret in .env.");
    builder.Configuration["Jwt:Secret"] = jwt.Secret;
}

// "Smart" routes each request: an API key (X-API-Key, or Bearer rsk_...) goes to the ApiKey
// handler, everything else to JWT validation. See Authentication/ApiKeyAuthenticationHandler.
builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = "Smart";
        options.DefaultChallengeScheme = "Smart";
    })
    .AddPolicyScheme("Smart", "JWT or API key", o =>
        o.ForwardDefaultSelector = ctx => ApiKeyAuthenticationHandler.LooksLikeApiKey(ctx.Request)
            ? ApiKeyAuthenticationHandler.Scheme
            : JwtBearerDefaults.AuthenticationScheme)
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
        ApiKeyAuthenticationHandler.Scheme, null)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        options.Events = new JwtBearerEvents
        {
            // Access tokens live for AccessTokenMinutes, so check the account on every request:
            // a suspension must cut off API access immediately, and a user removed from
            // Admin:Emails must lose the admin claim without waiting for the token to expire.
            OnTokenValidated = async ctx =>
            {
                var idClaim = ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(idClaim, out var userId))
                {
                    ctx.Fail("Invalid token.");
                    return;
                }
                var db = ctx.HttpContext.RequestServices.GetRequiredService<Backend.Data.AppDbContext>();
                var user = await db.Users.AsNoTracking().Where(u => u.Id == userId)
                    .Select(u => new { u.Email, u.IsSuspended }).FirstOrDefaultAsync();
                if (user is null || user.IsSuspended)
                {
                    ctx.Fail("Account unavailable.");
                    return;
                }
                var admins = ctx.HttpContext.RequestServices.GetRequiredService<Backend.Authentication.AdminAccess>();
                if (ctx.Principal?.Identity is System.Security.Claims.ClaimsIdentity identity && !admins.IsAdmin(user.Email))
                    foreach (var c in identity.FindAll(Backend.Authentication.JwtTokenService.PlatformAdminClaim).ToList())
                        identity.RemoveClaim(c);
            },
        };
    });
builder.Services.AddSingleton<Backend.Authentication.AdminAccess>();
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy(Backend.Authentication.AdminAccess.Policy, p =>
        p.RequireClaim(Backend.Authentication.JwtTokenService.PlatformAdminClaim, "true"));
    // Account-level actions need a real signed-in session, not an API key.
    o.AddPolicy(ApiKeyAuthenticationHandler.SessionOnlyPolicy, p => p
        .RequireAuthenticatedUser()
        .RequireAssertion(c => !c.User.HasClaim(ApiKeyAuthenticationHandler.MethodClaim, ApiKeyAuthenticationHandler.MethodApiKey)));
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationMiddlewareResultHandler, Backend.Authentication.AdminDeniedHandler>();

// ---------------------------------------------------------------------------
// Upload ceiling: Upload:MaxBytes (appsettings) or Upload__MaxBytes (env). Not unlimited.
// ---------------------------------------------------------------------------
var uploadMaxBytes = builder.Configuration.GetValue<long?>("Upload:MaxBytes") ?? 200L * 1024 * 1024;
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = uploadMaxBytes);
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = uploadMaxBytes;
    o.ValueLengthLimit = int.MaxValue;
    o.MultipartHeadersLengthLimit = int.MaxValue;
    o.MemoryBufferThreshold = 1024 * 1024; // spool to disk early, don't hold it in memory
});

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------
builder.Services.Configure<RagSettings>(builder.Configuration.GetSection("Rag"));
var rag = builder.Configuration.GetSection("Rag").Get<RagSettings>() ?? new RagSettings();
var ragApiKey = !string.IsNullOrWhiteSpace(rag.ApiKey) ? rag.ApiKey : builder.Configuration["RAG_API_KEY"];
if (string.IsNullOrWhiteSpace(ragApiKey))
    Console.Error.WriteLine(
        "[startup] WARNING: Rag:ApiKey / RAG_API_KEY is not set - the Python RAG service is being " +
        "called without authentication. Set the same RAG_API_KEY for the backend and the rag service.");
builder.Services.AddHttpClient<IRagService, RagService>(client =>
{
    client.BaseAddress = new Uri(rag.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(rag.TimeoutSeconds);
    if (!string.IsNullOrWhiteSpace(ragApiKey))
        client.DefaultRequestHeaders.Add("X-Rag-Api-Key", ragApiKey);
});

// The spec (and Supabase's own dashboard) names these flat - SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY - not Supabase__Url etc. Map them onto the "Supabase" section so
// both naming styles work (docker-compose.yml already maps flat -> Supabase__* itself).
foreach (var (flatKey, sectionKey) in new[]
         {
             ("SUPABASE_URL", "Supabase:Url"),
             ("SUPABASE_ANON_KEY", "Supabase:AnonKey"),
             ("SUPABASE_SERVICE_ROLE_KEY", "Supabase:ServiceRoleKey"),
         })
{
    var flatValue = builder.Configuration[flatKey];
    if (!string.IsNullOrWhiteSpace(flatValue) && string.IsNullOrWhiteSpace(builder.Configuration[sectionKey]))
        builder.Configuration[sectionKey] = flatValue;
}

builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection("Supabase"));
var supabase = builder.Configuration.GetSection("Supabase").Get<SupabaseOptions>() ?? new SupabaseOptions();
if (supabase.IsConfigured)
{
    builder.Services.AddHttpClient<IStorageService, SupabaseStorageService>();
}
else
{
    // Zero-config local dev fallback - see Integrations/Supabase/LocalDiskStorageService.
    builder.Services.AddSingleton<IStorageService, LocalDiskStorageService>();
}

// ---------------------------------------------------------------------------
// Application services
// ---------------------------------------------------------------------------
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IResourceAuthorizationService, ResourceAuthorizationService>();

// Email (password reset / verification links). SMTP is optional - see Integrations/Email.
builder.Services.Configure<Backend.Integrations.Email.EmailOptions>(builder.Configuration.GetSection("Email"));
if (!string.IsNullOrWhiteSpace(builder.Configuration["Email:Smtp:Host"]))
    builder.Services.AddSingleton<Backend.Integrations.Email.IEmailSender, Backend.Integrations.Email.SmtpEmailSender>();
else
    builder.Services.AddSingleton<Backend.Integrations.Email.IEmailSender, Backend.Integrations.Email.LogEmailSender>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPlanLimitService, PlanLimitService>();
builder.Services.AddScoped<IKnowledgeBaseService, KnowledgeBaseService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<IWorkspaceService, WorkspaceService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();
builder.Services.AddScoped<IBillingService, BillingService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminAuditService, Backend.Services.Admin.AdminAuditService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminDashboardService, Backend.Services.Admin.AdminDashboardService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminUserService, Backend.Services.Admin.AdminUserService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminResourceService, Backend.Services.Admin.AdminResourceService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminJobService, Backend.Services.Admin.AdminJobService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminHealthService, Backend.Services.Admin.AdminHealthService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminBusinessService, Backend.Services.Admin.AdminBusinessService>();
builder.Services.AddSingleton<Backend.Services.ISecurityEventService, Backend.Services.SecurityEventService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminSecurityService, Backend.Services.Admin.AdminSecurityService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminUsageService, Backend.Services.Admin.AdminUsageService>();
builder.Services.AddScoped<Backend.Services.IPlatformSettingsService, Backend.Services.PlatformSettingsService>();
builder.Services.AddScoped<Backend.Services.ISupportService, Backend.Services.SupportService>();
builder.Services.AddScoped<Backend.Services.Admin.IAdminCmsService, Backend.Services.Admin.AdminCmsService>();

// Drains DocumentProcessingJob rows off the request thread - see BackgroundJobs/DocumentProcessingBackgroundService.
builder.Services.AddHostedService<Backend.BackgroundJobs.DocumentProcessingBackgroundService>();

// ---------------------------------------------------------------------------
// Rate limiting (spec section 24) - simple fixed-window IP limiting, configured
// under "IpRateLimiting" in appsettings.json.
// ---------------------------------------------------------------------------
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));

// The limiter keys on the TCP peer address. It must NOT read a client-supplied header such as
// X-Real-IP (anyone could rotate it to dodge the limit). Behind a reverse proxy, opt in to
// ForwardedHeaders and list the proxy addresses you trust: ForwardedHeaders__Enabled=true,
// ForwardedHeaders__KnownProxies__0=10.0.0.5 - the real client IP is then taken from X-Forwarded-For
// only when the request comes from one of those proxies.
var forwardedEnabled = builder.Configuration.GetValue<bool>("ForwardedHeaders:Enabled");
if (forwardedEnabled)
{
    builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                             | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
        o.KnownNetworks.Clear();
        o.KnownProxies.Clear();
        foreach (var proxy in builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
            if (System.Net.IPAddress.TryParse(proxy, out var ip)) o.KnownProxies.Add(ip);
    });
}
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// ---------------------------------------------------------------------------
// CORS - only the configured frontend origins may call this API.
// ---------------------------------------------------------------------------
const string CorsPolicy = "frontend";
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p =>
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("X-Total-Count")));

builder.Services.AddControllers();

// DataAnnotations on DTOs (spec section 29) drive automatic model validation; make its
// 400 response match the same { success:false, message, errors } envelope as everything
// else (spec section 28), instead of ASP.NET's default ValidationProblemDetails shape.
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(kv => kv.Value?.Errors.Count > 0)
            .SelectMany(kv => kv.Value!.Errors.Select(e => string.IsNullOrEmpty(e.ErrorMessage)
                ? $"{kv.Key} is invalid." : e.ErrorMessage))
            .ToList();

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(
            Backend.DTOs.Common.ApiResponse<object?>.Fail("Validation failed.", errors));
    };
});

// ---------------------------------------------------------------------------
// Swagger, grouped by feature area (spec section 31).
// ---------------------------------------------------------------------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "RAG Starter API", Version = "v1" });
    // Controllers carry a [Tags("...")] attribute (spec section 31's grouping) - Swashbuckle
    // groups on it automatically, no extra configuration needed.
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the access token returned by /api/auth/login.",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        },
    });
});

var app = builder.Build();

// Apply migrations and seed reference data (Plans) at startup - see Data/DbInitializer.cs.
// A database that isn't reachable yet (e.g. Supabase not configured) does not crash the
// whole API: it starts anyway so /api/health can report "database: unhealthy" instead of
// the container just crash-looping with no diagnostics.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await DbInitializer.MigrateAndSeedAsync(db);
    }
    catch (Exception ex)
    {
        var startupLog = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        startupLog.LogError(ex,
            "Could not migrate/seed the database at startup. Check DATABASE_CONNECTION_STRING " +
            "(see .env.example) - most endpoints will fail until this is fixed.");
    }
}

app.UseMiddleware<ExceptionHandlingMiddleware>(); // must be first: catches everything below
app.UseMiddleware<RequestLoggingMiddleware>();

// The API docs are a map of every endpoint - on in Development, or when Swagger:Enabled=true.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Baseline hardening headers for every API response (the API only serves JSON).
app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h["X-Content-Type-Options"] = "nosniff";
    h["X-Frame-Options"] = "DENY";
    h["Referrer-Policy"] = "no-referrer";
    h["Content-Security-Policy"] = ctx.Request.Path.StartsWithSegments("/swagger")
        ? "default-src 'self' 'unsafe-inline' data:"
        : "default-src 'none'; frame-ancestors 'none'";
    await next();
});

if (forwardedEnabled) app.UseForwardedHeaders();
app.UseMiddleware<Backend.Services.RecordingIpRateLimitMiddleware>();
app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<MaintenanceMiddleware>();

app.MapControllers();

app.Run();
