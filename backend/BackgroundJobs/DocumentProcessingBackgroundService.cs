using Backend.Services;

namespace Backend.BackgroundJobs;

/// <summary>Drains <see cref="Models.DocumentProcessingJob"/> rows so document ingestion
/// never runs inside an HTTP request (spec: "do not process large documents inside the HTTP
/// request"). Deliberately the simplest thing that works - a single in-process polling loop,
/// per the spec's "start simple with ASP.NET Core BackgroundService if appropriate." The
/// claim-then-process split in IDocumentService (ClaimNextQueuedJobAsync / ProcessJobAsync) is
/// the seam a real queue (e.g. a hosted worker pulling from SQS/Azure Queue) would replace
/// later without touching DocumentService's business logic.</summary>
public class DocumentProcessingBackgroundService : BackgroundService
{
    private static readonly TimeSpan IdlePollInterval = TimeSpan.FromSeconds(3);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DocumentProcessingBackgroundService> _log;

    public DocumentProcessingBackgroundService(IServiceScopeFactory scopeFactory, ILogger<DocumentProcessingBackgroundService> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the host finish starting (migrations, etc.) before the first poll.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            bool processedOne;
            try
            {
                processedOne = await ClaimAndProcessOneAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A single bad job (or a transient DB blip) must not kill the loop for every
                // other queued document.
                _log.LogError(ex, "Unhandled error in document processing loop");
                processedOne = false;
            }

            // Drain the queue back-to-back while there's work; only idle-poll when it's empty.
            if (!processedOne)
            {
                try
                {
                    await Task.Delay(IdlePollInterval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    return;
                }
            }
        }
    }

    private async Task<bool> ClaimAndProcessOneAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var documents = scope.ServiceProvider.GetRequiredService<IDocumentService>();

        var jobId = await documents.ClaimNextQueuedJobAsync(ct);
        if (jobId is null) return false;

        // Per-attempt timeout is enforced by IRagService's own HttpClient (Rag:TimeoutSeconds) -
        // a hung ingest call fails as a RagException there, which ProcessJobAsync retries.
        await documents.ProcessJobAsync(jobId.Value, ct);
        return true;
    }
}
