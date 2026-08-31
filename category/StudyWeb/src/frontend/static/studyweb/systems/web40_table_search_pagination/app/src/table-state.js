export const PAGE_SIZE = 5;

export function buildTableState(data, options = {}) {
  const keyword = String(options.keyword ?? '').trim().toLowerCase();
  const status = options.status ?? 'all';
  const ascending = options.ascending ?? true;
  const pageSize = options.pageSize ?? PAGE_SIZE;

  const filtered = data
    .filter((item) => item.name.toLowerCase().includes(keyword))
    .filter((item) => status === 'all' || item.status === status)
    .sort((left, right) => (
      ascending
        ? left.name.localeCompare(right.name)
        : right.name.localeCompare(left.name)
    ));

  const totalPages = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const requestedPage = Number.isInteger(options.page) ? options.page : 0;
  const page = totalPages === 0
    ? 0
    : Math.min(Math.max(0, requestedPage), totalPages - 1);
  const start = page * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    filteredCount: filtered.length,
    totalPages,
    page,
    rangeStart: filtered.length === 0 ? 0 : start + 1,
    rangeEnd: start + items.length,
    hasPrevious: page > 0,
    hasNext: totalPages > 0 && page < totalPages - 1
  };
}
