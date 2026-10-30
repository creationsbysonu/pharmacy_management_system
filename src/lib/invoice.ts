import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/server";

export interface InvoiceLine {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

/** The pharmacy this invoice belongs to. Never another tenant's details. */
export interface InvoiceBrand {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface InvoiceData {
  saleId: number;
  soldAt: string;
  pharmacy: InvoiceBrand;
  workspaceId: string;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  cashier: string | null;
  lines: InvoiceLine[];
  total: number;
}

function money(value: number): string {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function when(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Loads one sale with everything an invoice needs. RLS scopes the read, so a
 * sale id from another pharmacy simply comes back empty.
 */
export async function loadInvoice(
  saleId: number,
  pharmacy: InvoiceBrand,
): Promise<InvoiceData | null> {
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("sales")
    // The composite foreign keys added by migration 0003 mean `sales` reaches
    // `customer`, `employee` and `sales_items` by two paths each, so the embed
    // has to name the constraint it means. Without the hint PostgREST refuses
    // with "more than one relationship was found" and every invoice 404s.
    .select(
      "sale_id, sold_at, total_amt, workspace_id, customer!sales_customer_workspace_fk(c_fname, c_lname, c_mail, c_phno), employee!sales_employee_workspace_fk(e_fname, e_lname), sales_items!sales_items_sale_workspace_fk(sale_qty, tot_price, meds!sales_items_med_workspace_fk(med_name))",
    )
    .eq("sale_id", saleId)
    .maybeSingle<{
      sale_id: number;
      sold_at: string;
      total_amt: number;
      workspace_id: string;
      customer: { c_fname: string; c_lname: string | null; c_mail: string | null; c_phno: string | null } | null;
      employee: { e_fname: string; e_lname: string | null } | null;
      sales_items: { sale_qty: number; tot_price: number; meds: { med_name: string } | null }[] | null;
    }>();

  if (!sale) return null;

  const items = sale.sales_items ?? [];
  const lines: InvoiceLine[] = items.map((item) => {
    const qty = Number(item.sale_qty ?? 0);
    const total = Number(item.tot_price ?? 0);
    return {
      name: item.meds?.med_name ?? "Medicine",
      qty,
      unitPrice: qty > 0 ? total / qty : total,
      total,
    };
  });

  return {
    saleId: sale.sale_id,
    soldAt: sale.sold_at,
    pharmacy,
    workspaceId: sale.workspace_id,
    customer: sale.customer
      ? {
          name: `${sale.customer.c_fname} ${sale.customer.c_lname ?? ""}`.trim(),
          email: sale.customer.c_mail,
          phone: sale.customer.c_phno,
        }
      : null,
    cashier: sale.employee
      ? `${sale.employee.e_fname} ${sale.employee.e_lname ?? ""}`.trim()
      : null,
    lines,
    total: Number(sale.total_amt ?? 0),
  };
}

export function buildInvoicePdf(invoice: InvoiceData): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 44;
  const brand = invoice.pharmacy;

  doc.setFillColor(12, 20, 24);
  doc.rect(0, 0, width, 118, "F");

  // Organization identity: the pharmacy's own name and contact details.
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(brand.name.slice(0, 64), margin, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(185, 200, 195);

  let brandY = 56;
  if (brand.address) {
    const addressLines = doc.splitTextToSize(brand.address, 300).slice(0, 2);
    for (const line of addressLines as string[]) {
      doc.text(line, margin, brandY);
      brandY += 11;
    }
  }
  const contact = [brand.phone, brand.email].filter(Boolean).join("  ·  ");
  if (contact) {
    doc.text(contact, margin, brandY);
    brandY += 11;
  }
  doc.setTextColor(150, 170, 165);
  doc.text("Tax invoice / receipt", margin, Math.max(brandY, 86));

  doc.setTextColor(220, 232, 228);
  doc.setFontSize(9);
  doc.text(`INV-${String(invoice.saleId).padStart(5, "0")}`, width - margin, 40, {
    align: "right",
  });
  doc.text(when(invoice.soldAt), width - margin, 56, { align: "right" });

  // Billed to ---------------------------------------------------------------
  let y = 150;
  doc.setTextColor(30, 40, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Billed to", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 16;
  doc.text(invoice.customer?.name ?? "Walk-in customer", margin, y);
  if (invoice.customer?.phone) {
    y += 14;
    doc.text(invoice.customer.phone, margin, y);
  }
  if (invoice.customer?.email) {
    y += 14;
    doc.text(invoice.customer.email, margin, y);
  }

  if (invoice.cashier) {
    doc.setFontSize(9);
    doc.setTextColor(120, 130, 135);
    doc.text(`Served by ${invoice.cashier}`, width - margin, 166, { align: "right" });
  }

  autoTable(doc, {
    head: [["Medicine", "Qty", "Unit price", "Amount"]],
    body: invoice.lines.map((line) => [
      line.name,
      String(line.qty),
      money(line.unitPrice),
      money(line.total),
    ]),
    startY: y + 30,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 6, textColor: [30, 40, 45] },
    headStyles: { fillColor: [22, 92, 72], textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  const bottom =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 240;
  doc.setDrawColor(225, 230, 232);
  doc.line(width - margin - 200, bottom + 16, width - margin, bottom + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 40, 45);
  doc.text("Total paid", width - margin - 190, bottom + 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(money(invoice.total), width - margin, bottom + 34, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 140, 145);
  doc.text(
    "Thank you. Keep this receipt for returns and insurance claims.",
    margin,
    height - 48,
  );
  const footerContact = [brand.name, brand.phone, brand.email].filter(Boolean).join("  ·  ");
  doc.text(footerContact.slice(0, 120), margin, height - 34);

  return new Uint8Array(doc.output("arraybuffer"));
}

export function invoiceFilename(invoice: InvoiceData): string {
  return `invoice-${String(invoice.saleId).padStart(5, "0")}.pdf`;
}
