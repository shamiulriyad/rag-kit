using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Settings;

/// <summary>Shaped to match frontend/src/pages/SettingsPage.tsx's local <c>Config</c>
/// object. UI/retrieval preferences only - never secrets (spec section 21).</summary>
public record UserSettingsResponse(
    string Theme, string DefaultModel, string EmbeddingModel,
    int ChunkSize, int ChunkOverlap, int TopK, double SimilarityThreshold, double Temperature);

public record UpdateUserSettingsRequest(
    string? Theme,
    string? DefaultModel,
    string? EmbeddingModel,
    [Range(100, 4000)] int? ChunkSize,
    [Range(0, 1000)] int? ChunkOverlap,
    [Range(1, 20)] int? TopK,
    [Range(0, 1)] double? SimilarityThreshold,
    [Range(0, 2)] double? Temperature);
