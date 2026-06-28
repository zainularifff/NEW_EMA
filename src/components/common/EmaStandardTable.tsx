import type { ReactNode } from "react";

export type EmaStandardTableColumn<T> = {
  key: string;
  title: ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  render: (row: T, index: number) => ReactNode;
};

type EmaStandardTableProps<T> = {
  toolbar?: ReactNode;
  columns: EmaStandardTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  loadingText?: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  getRowKey?: (row: T, index: number) => string;
  itemLabel?: string;
};

export default function EmaStandardTable<T>({
  toolbar,
  columns,
  data,
  loading = false,
  emptyText = "No record found.",
  loadingText = "Loading records...",
  page,
  pageSize,
  onPageChange,
  getRowKey,
  itemLabel = "records",
}: EmaStandardTableProps<T>) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);
  const from = total ? start + 1 : 0;
  const to = Math.min(start + rows.length, total);

  const go = (nextPage: number) => onPageChange(Math.min(Math.max(1, nextPage), totalPages));

  return (
    <section>
      {toolbar && <header>{toolbar}</header>}

      <main>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width, textAlign: column.align || "left" }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length}>{loadingText}</td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}

            {!loading && rows.map((row, rowIndex) => (
              <tr key={getRowKey ? getRowKey(row, start + rowIndex) : String(start + rowIndex)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{ textAlign: column.align || "left" }}
                  >
                    {column.render(row, start + rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {!loading && total > 0 && (
        <footer>
          <div>Showing {from} to {to} of {total} {itemLabel}</div>

          <nav>
            <button type="button" onClick={() => go(1)} disabled={safePage === 1}>?</button>
            <button type="button" onClick={() => go(safePage - 1)} disabled={safePage === 1}>?</button>
            <span>{safePage}</span>
            <button type="button" onClick={() => go(safePage + 1)} disabled={safePage === totalPages}>?</button>
            <button type="button" onClick={() => go(totalPages)} disabled={safePage === totalPages}>?</button>
          </nav>

          <aside>{pageSize} / page</aside>
        </footer>
      )}
    </section>
  );
}
