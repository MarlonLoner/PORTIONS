import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  emptyMessage = "No records found."
}: {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-clinical-50/50">
                  {columns.map((column) => (
                    <td key={column.header} className={column.className ?? "whitespace-nowrap px-4 py-4 text-slate-700"}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
