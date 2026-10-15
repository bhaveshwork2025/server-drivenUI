import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "./primitives";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  width?: string;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  toolbar?: ReactNode;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  searchText,
  searchPlaceholder = "Search...",
  pageSize = 10,
  emptyTitle = "Nothing here yet",
  emptyMessage,
  toolbar,
  selectable,
  selectedIds,
  onSelectionChange,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query || !searchText) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => searchText(r).toLowerCase().includes(q));
  }, [rows, query, searchText]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
    setPage(0);
  }

  function toggleRow(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  function toggleAllOnPage() {
    if (!onSelectionChange || !selectedIds) return;
    const pageIds = pageRows.map(getRowId);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    onSelectionChange(next);
  }

  return (
    <div className="data-table">
      {(searchText || toolbar) && (
        <div className="data-table__toolbar">
          {searchText && (
            <input
              className="input"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          )}
          <div className="data-table__toolbar-actions">{toolbar}</div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <>
          <div className="data-table__scroll">
            <table>
              <thead>
                <tr>
                  {selectable && (
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={pageRows.length > 0 && pageRows.every((r) => selectedIds?.has(getRowId(r)))}
                        onChange={toggleAllOnPage}
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width, textAlign: col.align ?? "left", cursor: col.sortValue ? "pointer" : "default" }}
                      onClick={() => col.sortValue && toggleSort(col.key)}
                    >
                      {col.header}
                      {sortKey === col.key && <span className="data-table__sort-arrow">{sortDir === 1 ? " ▲" : " ▼"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const id = getRowId(row);
                  return (
                    <tr key={id} className={onRowClick ? "data-table__row--clickable" : ""} onClick={() => onRowClick?.(row)}>
                      {selectable && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds?.has(id) ?? false} onChange={() => toggleRow(id)} />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="data-table__pagination">
            <span>
              {sorted.length} result{sorted.length === 1 ? "" : "s"}
            </span>
            <div className="data-table__pagination-controls">
              <button className="btn btn--ghost btn--sm" disabled={clampedPage === 0} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span>
                Page {clampedPage + 1} of {totalPages}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                disabled={clampedPage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
