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

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
    });
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

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
builder.Services.AddHttpClient<IRagService, RagService>(client =>
{
    client.BaseAddress = new Uri(rag.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(rag.TimeoutSeconds);
});

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

// ---------------------------------------------------------------------------
// Rate limiting (spec section 24) - simple fixed-window IP limiting, configured
// under "IpRateLimiting" in appsettings.json.
// ---------------------------------------------------------------------------
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// ---------------------------------------------------------------------------
// CORS - only the configured frontend origins may call this API.
// ---------------------------------------------------------------------------
const string CorsPolicy = "frontend";
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p =>
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

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

app.UseSwagger();
app.UseSwaggerUI();

app.UseIpRateLimiting();
app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
