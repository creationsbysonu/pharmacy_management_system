function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Guard against spreadsheet formula injection in exported user data.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const row of rows) lines.push(row.map(cell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

export function filenameFor(parts: (string | number | undefined | null)[]): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return ["pharmacia", ...parts.filter(Boolean), stamp]
    .join("-")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .concat(".csv");
}
