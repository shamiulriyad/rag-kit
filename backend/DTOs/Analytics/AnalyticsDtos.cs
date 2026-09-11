namespace Backend.DTOs.Analytics;

public record AnalyticsOverviewResponse(
    int TotalKnowledgeBases, int TotalDocuments, int TotalChunks,
    int TotalQuestionsThisMonth, long StorageBytes,
    List<TopKnowledgeBaseItem> MostUsedKnowledgeBases);

public record TopKnowledgeBaseItem(Guid Id, string Name, int Documents, int Chunks);

public record TimeSeriesPoint(DateOnly Date, int Count);
