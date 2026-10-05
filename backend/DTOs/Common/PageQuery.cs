namespace Backend.DTOs.Common;

/// <summary>Optional <c>?page=&amp;pageSize=</c> for list endpoints. Without them a caller gets the
/// first <see cref="DefaultSize"/> rows (never an unbounded result); the full count is returned in
/// the <c>X-Total-Count</c> response header so a client can tell when there is more.</summary>
public readonly record struct PageQuery(int Page, int PageSize)
{
    public const int DefaultSize = 200;
    public const int MaxSize = 500;

    public int Skip => (Page - 1) * PageSize;

    public static PageQuery From(int? page, int? pageSize) =>
        new(Math.Max(page ?? 1, 1), Math.Clamp(pageSize ?? DefaultSize, 1, MaxSize));
}
