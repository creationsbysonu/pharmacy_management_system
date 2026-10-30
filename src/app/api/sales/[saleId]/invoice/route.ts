import { NextResponse } from "next/server";
import { getAccess } from "@/lib/auth";
import { buildInvoicePdf, invoiceFilename, loadInvoice } from "@/lib/invoice";
import { invoiceBrand, loadPharmacyProfile } from "@/lib/pharmacy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ saleId: string }> },
) {
  const access = await getAccess();
  if (!access) {
    return NextResponse.json({ error: "Sign in to download invoices." }, { status: 401 });
  }

  if (access.suspended) {
    return NextResponse.json({ error: "This workspace is suspended." }, { status: 403 });
  }

  const { saleId } = await params;
  const id = Number(saleId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Unknown invoice." }, { status: 404 });
  }

  const pharmacy = await loadPharmacyProfile(access.workspaceId);
  const invoice = await loadInvoice(id, invoiceBrand(pharmacy, access.pharmacyName));
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found in this pharmacy." }, { status: 404 });
  }

  const pdf = buildInvoicePdf(invoice);

  return new Response(pdf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceFilename(invoice)}"`,
      "Cache-Control": "no-store",
    },
  });
}
