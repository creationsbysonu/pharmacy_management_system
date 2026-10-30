import { createClient } from "@/lib/supabase/server";

export const EXPORT_KINDS = ["sales", "stock", "expiry", "customers", "purchases"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export function isExportKind(value: string): value is ExportKind {
  return (EXPORT_KINDS as readonly string[]).includes(value);
}

export interface ReportTable {
  title: string;
  filename: string;
  columns: string[];
  rows: (string | number)[][];
  /** Short lines printed under the title in a PDF. */
  meta: string[];
}

const DATE = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function day(value: string | null | undefined): string {
  if (!value) return "—";
  return DATE.format(new Date(value));
}

function stamp(value: string | null | undefined): string {
  if (!value) return "—";
  return DATE_TIME.format(new Date(value));
}

function rupees(value: number | null | undefined): string {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** PostgreSQL LIKE-escapes a free-text search term. */
function likeTerm(value: string): string {
  return `%${value.replace(/[%_]/g, (match) => `\\${match}`)}%`;
}

export interface ReportOptions {
  rangeDays: number;
  search?: string;
}

export async function buildReport(
  kind: ExportKind,
  pharmacyName: string,
  options: ReportOptions,
): Promise<ReportTable> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - (options.rangeDays - 1));
  since.setHours(0, 0, 0, 0);

  const generated = `Generated ${stamp(new Date().toISOString())} · ${pharmacyName}`;
  const windowLabel = `Last ${options.rangeDays} days (from ${day(since.toISOString())})`;

  if (kind === "sales") {
    const { data } = await supabase
      .from("sales")
      .select("sale_id, sold_at, total_amt, customer!sales_customer_workspace_fk(c_fname, c_lname), sales_items!sales_items_sale_workspace_fk(sale_qty)")
      .gte("sold_at", since.toISOString())
      .order("sold_at", { ascending: false })
      .limit(5000);

    const rows = ((data ?? []) as unknown as {
      sale_id: number;
      sold_at: string;
      total_amt: number;
      customer: { c_fname: string; c_lname: string | null } | null;
      sales_items: { sale_qty: number }[] | null;
    }[]).map((sale) => {
      const name = sale.customer
        ? `${sale.customer.c_fname} ${sale.customer.c_lname ?? ""}`.trim()
        : "Walk-in";
      const units = (sale.sales_items ?? []).reduce((sum, item) => sum + Number(item.sale_qty ?? 0), 0);
      return [sale.sale_id, stamp(sale.sold_at), name, units, Number(sale.total_amt ?? 0)];
    });

    const total = rows.reduce((sum, row) => sum + Number(row[4]), 0);

    return {
      title: "Sales report",
      filename: "sales-report",
      columns: ["Invoice", "Sold at", "Customer", "Units", "Total (INR)"],
      rows: [...rows, ["", "", "", "Total", rupees(total)]],
      meta: [generated, windowLabel, `${rows.length} invoices · ${rupees(total)}`],
    };
  }

  if (kind === "stock") {
    const { data } = await supabase
      .from("meds")
      .select("med_id, med_name, category, med_qty, med_price, location_rack")
      .order("med_name", { ascending: true })
      .limit(5000);

    const search = options.search?.trim();
    const filtered = ((data ?? []) as {
      med_id: number;
      med_name: string;
      category: string | null;
      med_qty: number;
      med_price: number;
      location_rack: string | null;
    }[]).filter((med) =>
      search ? med.med_name.toLowerCase().includes(search.toLowerCase()) : true,
    );

    const value = filtered.reduce(
      (sum, med) => sum + Number(med.med_qty ?? 0) * Number(med.med_price ?? 0),
      0,
    );

    return {
      title: "Stock report",
      filename: "stock-report",
      columns: ["ID", "Medicine", "Category", "Qty", "Unit price", "Rack", "Value"],
      rows: filtered.map((med) => [
        med.med_id,
        med.med_name,
        med.category ?? "—",
        Number(med.med_qty ?? 0),
        rupees(med.med_price),
        med.location_rack ?? "—",
        rupees(Number(med.med_qty ?? 0) * Number(med.med_price ?? 0)),
      ]),
      meta: [generated, `${filtered.length} medicines · stock value ${rupees(value)}`],
    };
  }

  if (kind === "expiry") {
    const { data } = await supabase
      .from("v_expiring")
      .select("p_id, med_name, exp_date, days_left, p_qty")
      .order("days_left", { ascending: true })
      .limit(5000);

    const rows = ((data ?? []) as {
      p_id: number;
      med_name: string;
      exp_date: string;
      days_left: number;
      p_qty: number;
    }[]).map((row) => [
      row.p_id,
      row.med_name,
      day(row.exp_date),
      Number(row.days_left),
      Number(row.p_qty ?? 0),
      Number(row.days_left) < 0 ? "Expired" : Number(row.days_left) <= 30 ? "Action needed" : "Watch",
    ]);

    return {
      title: "Expiry report",
      filename: "expiry-report",
      columns: ["Batch", "Medicine", "Expires", "Days left", "Qty", "Status"],
      rows,
      meta: [generated, `${rows.length} batches with an expiry date on file`],
    };
  }

  if (kind === "customers") {
    const { data } = await supabase
      .from("customer")
      .select("c_id, c_fname, c_lname, c_phno, c_mail, c_age, c_sex, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    const rows = ((data ?? []) as {
      c_id: number;
      c_fname: string;
      c_lname: string | null;
      c_phno: string | null;
      c_mail: string | null;
      c_age: number | null;
      c_sex: string | null;
      created_at: string;
    }[]).map((row) => [
      row.c_id,
      `${row.c_fname} ${row.c_lname ?? ""}`.trim(),
      row.c_phno ?? "—",
      row.c_mail ?? "—",
      row.c_age ?? "—",
      row.c_sex ?? "—",
      day(row.created_at),
    ]);

    return {
      title: "Customer register",
      filename: "customers",
      columns: ["ID", "Name", "Phone", "Email", "Age", "Sex", "Registered"],
      rows,
      meta: [generated, `${rows.length} customers`],
    };
  }

  const { data } = await supabase
    .from("purchase")
    .select("p_id, pur_date, p_qty, p_cost, mfg_date, exp_date, meds!purchase_med_workspace_fk(med_name), suppliers!purchase_supplier_workspace_fk(sup_name)")
    .gte("pur_date", since.toISOString().slice(0, 10))
    .order("pur_date", { ascending: false })
    .limit(5000);

  const rows = ((data ?? []) as unknown as {
    p_id: number;
    pur_date: string;
    p_qty: number;
    p_cost: number;
    mfg_date: string | null;
    exp_date: string | null;
    meds: { med_name: string } | null;
    suppliers: { sup_name: string } | null;
  }[]).map((row) => [
    row.p_id,
    day(row.pur_date),
    row.meds?.med_name ?? "—",
    row.suppliers?.sup_name ?? "—",
    Number(row.p_qty ?? 0),
    rupees(row.p_cost),
    day(row.mfg_date),
    day(row.exp_date),
  ]);

  const spend = ((data ?? []) as { p_cost: number }[]).reduce(
    (sum, row) => sum + Number(row.p_cost ?? 0),
    0,
  );

  return {
    title: "Purchase report",
    filename: "purchases",
    columns: ["Batch", "Purchased", "Medicine", "Supplier", "Qty", "Cost", "Mfg", "Expiry"],
    rows,
    meta: [generated, windowLabel, `${rows.length} batches · ${rupees(spend)} spent`],
  };
}

export { likeTerm };
