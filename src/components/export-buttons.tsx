import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExportKind } from "@/lib/export/reports";

/**
 * Download controls. These are plain links to the export route rather than
 * fetch-and-blob code, so the browser handles the download natively and the
 * file is generated on the server with the signed-in user's permissions.
 */
export function ExportButtons({
  kind,
  range,
  search,
  className,
}: {
  kind: ExportKind;
  range?: string | number;
  search?: string;
  className?: string;
}) {
  const params = new URLSearchParams();
  if (range !== undefined) params.set("range", String(range));
  if (search) params.set("q", search);

  const href = (format: "xlsx" | "pdf") => {
    const query = new URLSearchParams(params);
    query.set("format", format);
    return `/api/export/${kind}?${query.toString()}`;
  };

  return (
    <div className={className ?? "flex flex-wrap gap-2"}>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={href("xlsx")}>
          <FileSpreadsheet className="size-3.5" /> Excel
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={href("pdf")}>
          <FileText className="size-3.5" /> PDF
        </a>
      </Button>
    </div>
  );
}
