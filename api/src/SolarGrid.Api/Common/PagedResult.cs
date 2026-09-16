/*
 * File:    PagedResult.cs
 * Module:  Common
 * Owner:   Ravindu
 * Purpose: One page of a list plus the total count, used by all list endpoints.
 */
namespace SolarGrid.Api.Common;

public class PagedResult<T>
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    // Wraps the items of the current page.
    public PagedResult(IReadOnlyList<T> items, long total, int page, int pageSize)
    {
        Items = items;
        Total = total;
        Page = page;
        PageSize = pageSize;
    }

    public IReadOnlyList<T> Items { get; }

    public long Total { get; }

    public int Page { get; }

    public int PageSize { get; }

    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(Total / (double)PageSize);

    // Keeps page numbers and sizes inside safe limits.
    public static (int Page, int PageSize) Normalize(int page, int pageSize)
    {
        var safePage = page < 1 ? 1 : page;
        var safeSize = pageSize < 1 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize);
        return (safePage, safeSize);
    }
}
