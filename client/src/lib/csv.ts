// Guards against spreadsheet formula injection (CSV cells starting with
// =, +, -, @ get a leading tab/quote stripped of its "run as formula"
// meaning when opened in Excel/Sheets) and against commas/quotes breaking
// the row shape.
function escapeCsvCell(value: unknown): string {
  let str = String(value ?? "");
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) str = `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  return [header, ...body].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns: { key: string; label: string }[]): void {
  const csv = toCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
