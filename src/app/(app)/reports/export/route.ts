import { NextResponse, type NextRequest } from "next/server";
import { getAccess } from "@/lib/auth";
import { csvResponse, filenameFor, toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

/**
 * Report downloads. Every query runs as the signed-in user, so row level
 * security decides what can leave the workspace; admin-only reports are
 * checked again here because a URL can be typed by hand.
 */
export async function GET(request: NextRequest) {
  const access = await getAccess();
  if (!access) {
    return NextResponse.json({ error: "Sign in to download reports." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "sales";
  const from = searchParams.get("from") || `${new Date().toISOString().slice(0, 7)}-01`;
  const to = searchParams.get("to") || todayISO();

  const supabase = await createClient();

  if (type === "sales") {
    if (access.profile.role !== "admin") {
      return NextResponse.json({ error: "Administrators only." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("sales")
      .select("sale_id, sold_at, total_amt, customer!sales_customer_workspace_fk(c_fname, c_lname), employee!sales_employee_workspace_fk(e_fname, e_lname)")
      .gte("sold_at", `${from}T00:00:00`)
      .lte("sold_at", `${to}T23:59:59`)
      .order("sold_at", { ascending: false })
      .limit(5000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as unknown as {
      sale_id: number;
      sold_at: string;
      total_amt: number;
      customer: { c_fname: string; c_lname: string | null } | null;
      employee: { e_fname: string; e_lname: string | null } | null;
    }[];

    const csv = toCsv(
      ["Invoice", "Sold at", "Customer", "Billed by", "Amount (INR)"],
      rows.map((row) => [
        row.sale_id,
        row.sold_at,
        row.customer ? `${row.customer.c_fname} ${row.customer.c_lname ?? ""}`.trim() : "Walk-in",
        row.employee ? `${row.employee.e_fname} ${row.employee.e_lname ?? ""}`.trim() : "",
        Number(row.total_amt ?? 0).toFixed(2),
      ]),
    );

    return csvResponse(filenameFor(["sales", from, to]), csv);
  }

  if (type === "stock") {
    const [lowStock, meds] = await Promise.all([
      supabase.from("v_low_stock").select("*"),
      supabase
        .from("meds")
        .select("med_id, med_name, category, location_rack, med_qty, med_price")
        .order("med_name", { ascending: true })
        .limit(5000),
    ]);

    if (meds.error) return NextResponse.json({ error: meds.error.message }, { status: 500 });

    const rows = (meds.data ?? []) as {
      med_id: number;
      med_name: string;
      category: string | null;
      location_rack: string | null;
      med_qty: number;
      med_price: number;
    }[];
    const lowIds = new Set(((lowStock.data ?? []) as { med_id: number }[]).map((row) => row.med_id));

    const csv = toCsv(
      ["ID", "Medicine", "Category", "Rack", "In stock", "Unit price (INR)", "Stock value (INR)", "Low stock"],
      rows.map((row) => [
        row.med_id,
        row.med_name,
        row.category ?? "",
        row.location_rack ?? "",
        row.med_qty,
        Number(row.med_price ?? 0).toFixed(2),
        (Number(row.med_qty ?? 0) * Number(row.med_price ?? 0)).toFixed(2),
        lowIds.has(row.med_id) ? "yes" : "no",
      ]),
    );

    return csvResponse(filenameFor(["stock", todayISO()]), csv);
  }

  if (type === "expiry") {
    if (access.profile.role !== "admin") {
      return NextResponse.json({ error: "Administrators only." }, { status: 403 });
    }

    const { data, error } = await supabase.from("v_expiring").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as {
      p_id: number;
      med_name: string;
      sup_name: string | null;
      p_qty: number;
      exp_date: string;
      days_left: number;
    }[];

    const csv = toCsv(
      ["Purchase", "Medicine", "Supplier", "Quantity", "Expires", "Days left"],
      rows.map((row) => [
        row.p_id,
        row.med_name,
        row.sup_name ?? "",
        row.p_qty,
        row.exp_date,
        row.days_left,
      ]),
    );

    return csvResponse(filenameFor(["expiry", todayISO()]), csv);
  }

  if (type === "activity") {
    if (access.profile.role !== "admin") {
      return NextResponse.json({ error: "Administrators only." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("audit_log")
      .select("id, created_at, actor_email, action, entity, entity_id, summary")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json(
        { error: "The audit log is not installed. Run migration 0004." },
        { status: 503 },
      );
    }

    const csv = toCsv(
      ["When", "Who", "Action", "Entity", "Record", "Summary"],
      ((data ?? []) as {
        created_at: string;
        actor_email: string | null;
        action: string;
        entity: string;
        entity_id: string | null;
        summary: string;
      }[]).map((row) => [
        row.created_at,
        row.actor_email ?? "system",
        row.action,
        row.entity,
        row.entity_id ?? "",
        row.summary,
      ]),
    );

    return csvResponse(filenameFor(["activity", todayISO()]), csv);
  }

  return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
}
