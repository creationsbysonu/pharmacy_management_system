import { NextResponse, type NextRequest } from "next/server";
import { getAccess } from "@/lib/auth";
import { buildPdf, buildWorkbook, downloadHeaders } from "@/lib/export/files";
import { buildReport, isExportKind } from "@/lib/export/reports";

/** Reports an employee may download. Everything else is owner-only. */
const STAFF_ALLOWED = new Set(["stock", "expiry"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!isExportKind(kind)) {
    return NextResponse.json({ error: "Unknown report." }, { status: 404 });
  }

  const access = await getAccess();
  if (!access) {
    return NextResponse.json({ error: "Sign in to download reports." }, { status: 401 });
  }

  if (access.suspended) {
    return NextResponse.json({ error: "This workspace is suspended." }, { status: 403 });
  }

  if (access.profile.role !== "admin" && !STAFF_ALLOWED.has(kind)) {
    return NextResponse.json(
      { error: "Only an administrator can download this report." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const requestedRange = Number(url.searchParams.get("range") ?? 30);
  const rangeDays = Number.isFinite(requestedRange)
    ? Math.min(3650, Math.max(1, Math.trunc(requestedRange)))
    : 30;

  const report = await buildReport(kind, access.pharmacyName, {
    rangeDays,
    search: url.searchParams.get("q") ?? undefined,
  });

  const bytes = format === "pdf" ? buildPdf(report) : buildWorkbook(report);

  return new Response(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: downloadHeaders(report.filename, format),
  });
}
