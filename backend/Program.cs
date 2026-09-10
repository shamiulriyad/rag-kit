using Backend.Configuration;
using Backend.Services;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// --- Where is the Python RAG service? (appsettings.json -> "Rag", or Rag__BaseUrl env) ---
builder.Services.Configure<RagSettings>(builder.Configuration.GetSection("Rag"));
var rag = builder.Configuration.GetSection("Rag").Get<RagSettings>() ?? new RagSettings();

// --- Upload ceiling: Upload:MaxBytes (appsettings) or Upload__MaxBytes (env). Not unlimited. ---
var uploadMaxBytes = builder.Configuration.GetValue<long?>("Upload:MaxBytes") ?? 200L * 1024 * 1024;

builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = uploadMaxBytes);
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = uploadMaxBytes;   // the PDF part
    o.ValueLengthLimit = int.MaxValue;
    o.MultipartHeadersLengthLimit = int.MaxValue;
    o.MemoryBufferThreshold = 1024 * 1024;         // spool to disk early, don't hold it in memory
});

// --- Typed HttpClient: the only thing that calls Python ---
builder.Services.AddHttpClient<IRagService, RagService>(client =>
{
    client.BaseAddress = new Uri(rag.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(rag.TimeoutSeconds);
});

// --- CORS so the React dev server can call this API ---
const string CorsPolicy = "frontend";
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
              ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p =>
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers();

var app = builder.Build();
var log = app.Services.GetRequiredService<ILogger<Program>>();

// Every failure leaves the API as JSON { success, message } - never a dropped
// connection that React can only report as "Failed to fetch".
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (RagException ex)
    {
        await WriteError(context, ex.StatusCode, ex.Message);
    }
    catch (BadHttpRequestException ex)   // body over the limit, or malformed multipart
    {
        log.LogWarning(ex, "Rejected upload");
        await WriteError(context, StatusCodes.Status413PayloadTooLarge,
            $"PDF exceeds the configured upload limit of {uploadMaxBytes / (1024 * 1024)} MB.");
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Unhandled error");
        await WriteError(context, StatusCodes.Status500InternalServerError,
            "Unexpected error in the backend. Check its logs.");
    }
});

app.UseCors(CorsPolicy);
app.MapControllers();

app.Run();

static async Task WriteError(HttpContext context, int status, string message)
{
    if (context.Response.HasStarted) return;
    context.Response.StatusCode = status;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsJsonAsync(new { success = false, message });
}
