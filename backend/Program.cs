using Backend.Configuration;
using Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// --- Where is the Python RAG service? (appsettings.json -> "Rag", or Rag__BaseUrl env) ---
builder.Services.Configure<RagSettings>(builder.Configuration.GetSection("Rag"));
var rag = builder.Configuration.GetSection("Rag").Get<RagSettings>() ?? new RagSettings();

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

// Turn a failed call to the Python service into a clean JSON error for React.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (RagException ex)
    {
        context.Response.StatusCode = ex.StatusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
});

app.UseCors(CorsPolicy);
app.MapControllers();

app.Run();
