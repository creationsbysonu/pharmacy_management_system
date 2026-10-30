import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportTable } from "@/lib/export/reports";

/** Excel sheet names are limited to 31 characters and a small character set. */
function sheetName(title: string): string {
  return title.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Report";
}

export function buildWorkbook(report: ReportTable): Uint8Array {
  const header = [
    [report.title],
    ...report.meta.map((line) => [line]),
    [],
    report.columns,
  ];

  const sheet = XLSX.utils.aoa_to_sheet([...header, ...report.rows]);
  sheet["!cols"] = report.columns.map((column, index) => ({
    wch: Math.min(
      42,
      Math.max(
        column.length + 2,
        ...report.rows.slice(0, 200).map((row) => String(row[index] ?? "").length + 2),
      ),
    ),
  }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName(report.title));

  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(buffer);
}

export function buildPdf(report: ReportTable): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Masthead: title, pharmacy, filters. Drawn by hand so the first page looks
  // like a document and not a spreadsheet export.
  doc.setFillColor(12, 20, 24);
  doc.rect(0, 0, pageWidth, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.title, 40, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(190, 205, 200);
  report.meta.forEach((line, index) => {
    doc.text(line, 40, 50 + index * 12);
  });

  doc.setTextColor(30, 40, 45);
  autoTable(doc, {
    head: [report.columns],
    body: report.rows.map((row) => row.map((cell) => String(cell))),
    startY: 92,
    margin: { left: 40, right: 40, bottom: 40 },
    styles: { fontSize: 8, cellPadding: 4, textColor: [35, 45, 50], lineColor: [228, 232, 234], lineWidth: 0.4 },
    headStyles: { fillColor: [22, 92, 72], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 249, 248] },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(130, 140, 145);
      doc.text(
        `Pharmacia · ${report.title} · page ${page}`,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: "right" },
      );
    },
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

/** Response headers that make the download land with a sensible filename. */
export function downloadHeaders(filename: string, format: "xlsx" | "pdf"): Headers {
  const today = new Date().toISOString().slice(0, 10);
  return new Headers({
    "Content-Type":
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}-${today}.${format}"`,
    "Cache-Control": "no-store",
  });
}
