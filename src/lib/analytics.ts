import { createClient } from "@/lib/supabase/server";

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];
export type RangeKey = `${RangeDays}` | "all";

export interface DashboardRange {
  key: RangeKey;
  /** 0 for the all-time window. */
  days: number;
  allTime: boolean;
  start: Date;
  end: Date;
  previousStart: Date;
}

/** Everything since the oldest possible row, used for the all-time view. */
const EPOCH = new Date("2015-01-01T00:00:00Z");

export function parseRange(raw?: string | string[]): DashboardRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const end = new Date();

  if (value === "all") {
    return {
      key: "all",
      days: 0,
      allTime: true,
      start: EPOCH,
      end,
      previousStart: EPOCH,
    };
  }

  const days = (RANGE_OPTIONS as readonly number[]).includes(Number(value))
    ? (Number(value) as RangeDays)
    : 30;

  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - days);

  return { key: String(days) as RangeKey, days, allTime: false, start, end, previousStart };
}

export function rangeLabel(range: DashboardRange): string {
  return range.allTime ? "All time" : `Last ${range.days} days`;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface ProductRow {
  med_id: number;
  name: string;
  category: string | null;
  units: number;
  revenue: number;
}

export interface ActivityRow {
  id: number;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
}

export interface DashboardAnalytics {
  revenue: number;
  previousRevenue: number;
  invoices: number;
  previousInvoices: number;
  itemsSold: number;
  averageBasket: number;
  uniqueCustomers: number;
  todayRevenue: number;
  todayInvoices: number;
  dailySeries: SeriesPoint[];
  recentSpark: number[];
  weekdaySeries: SeriesPoint[];
  topProducts: ProductRow[];
  categoryMix: SeriesPoint[];
  inventoryCount: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiring30: number;
  expiring90: number;
  purchaseSpend: number;
  estimatedMargin: number;
  customerCount: number;
  newCustomers: number;
  employeeCount: number;
  lowStock: { med_id: number; med_name: string; med_qty: number; category: string | null }[];
  expiring: { p_id: number; med_name: string; exp_date: string; days_left: number; p_qty: number }[];
  recentSales: {
    sale_id: number;
    sold_at: string;
    total_amt: number;
    customer: { c_fname: string; c_lname: string | null } | null;
  }[];
  activity: ActivityRow[];
  auditAvailable: boolean;
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function shortDay(key: string): string {
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Buckets sales by day, or by month for long windows, including empty buckets
 * so the line never jumps over a quiet week.
 */
function buildSeries(
  rows: { sold_at: string; total_amt: number }[],
  range: DashboardRange,
): SeriesPoint[] {
  const monthly = range.allTime || range.days > 120;
  const buckets = new Map<string, number>();

  if (monthly) {
    const first = range.allTime && rows.length > 0
      ? new Date(Math.min(...rows.map((row) => Date.parse(row.sold_at))))
      : new Date(range.start);
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const last = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    while (cursor <= last) {
      buckets.set(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`, 0);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    for (const row of rows) {
      const date = new Date(row.sold_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(row.total_amt ?? 0));
    }
    return [...buckets.entries()].map(([key, total]) => {
      const [year, month] = key.split("-");
      return {
        label: `${MONTHS[Number(month) - 1]} ${year.slice(2)}`,
        value: Math.round(total * 100) / 100,
      };
    });
  }

  const cursor = new Date(range.start);
  const last = new Date(range.end);
  last.setHours(23, 59, 59, 999);

  while (cursor <= last) {
    buckets.set(dayKey(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const row of rows) {
    const key = dayKey(new Date(row.sold_at));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.total_amt ?? 0));
    }
  }

  return [...buckets.entries()].map(([key, total]) => ({
    label: shortDay(key),
    value: Math.round(total * 100) / 100,
  }));
}

function buildWeekdaySeries(rows: { sold_at: string; total_amt: number }[]): SeriesPoint[] {
  const totals = new Array(7).fill(0);
  for (const row of rows) {
    const index = new Date(row.sold_at).getDay();
    totals[index] += Number(row.total_amt ?? 0);
  }
  // Monday-first, the way a pharmacy rota reads.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((index) => ({
    label: WEEKDAYS[index],
    value: Math.round(totals[index] * 100) / 100,
  }));
}

function percentChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function deltaOf(current: number, previous: number): number {
  return percentChange(current, previous);
}

type SaleRow = {
  sale_id: number;
  sold_at: string;
  total_amt: number;
  c_id: number | null;
};

/** Everything the dashboard shows, in one round of parallel queries. */
export async function loadDashboard(range: DashboardRange): Promise<DashboardAnalytics> {
  const supabase = await createClient();
  const startISO = range.start.toISOString();
  const previousISO = range.previousStart.toISOString();
  const nowISO = range.end.toISOString();

  const [
    salesResult,
    previousSalesResult,
    itemsResult,
    purchasesResult,
    medsResult,
    expiryResult,
    customerResult,
    newCustomerResult,
    employeeResult,
    recentSalesResult,
    activityResult,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("sale_id, sold_at, total_amt, c_id")
      .gte("sold_at", startISO)
      .lte("sold_at", nowISO)
      .order("sold_at", { ascending: true })
      .limit(5000),
    supabase
      .from("sales")
      .select("sale_id, total_amt")
      .gte("sold_at", previousISO)
      .lt("sold_at", startISO)
      .limit(5000),
    supabase
      .from("sales_items")
      .select(
        "med_id, sale_qty, tot_price, meds!sales_items_med_workspace_fk(med_name, category), sales!sales_items_sale_workspace_fk!inner(sold_at)",
      )
      .gte("sales.sold_at", startISO)
      .lte("sales.sold_at", nowISO)
      .limit(5000),
    supabase
      .from("purchase")
      .select("med_id, p_qty, p_cost, pur_date")
      .order("pur_date", { ascending: false })
      .limit(2000),
    supabase
      .from("meds")
      .select("med_id, med_name, med_qty, category, med_price")
      .limit(5000),
    supabase.from("v_expiring").select("p_id, med_name, exp_date, days_left, p_qty, med_id"),
    supabase.from("customer").select("*", { count: "exact", head: true }),
    supabase
      .from("customer")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO),
    supabase.from("employee").select("*", { count: "exact", head: true }),
    supabase
      .from("sales")
      .select("sale_id, sold_at, total_amt, customer!sales_customer_workspace_fk(c_fname, c_lname)")
      .order("sold_at", { ascending: false })
      .limit(6),
    supabase
      .from("audit_log")
      .select("id, actor_email, action, entity, entity_id, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const sales = (salesResult.data ?? []) as SaleRow[];
  const previousSales = (previousSalesResult.data ?? []) as { sale_id: number; total_amt: number }[];
  const items = (itemsResult.data ?? []) as unknown as {
    med_id: number;
    sale_qty: number;
    tot_price: number;
    meds: { med_name: string; category: string | null } | null;
  }[];
  const purchases = (purchasesResult.data ?? []) as {
    med_id: number;
    p_qty: number;
    p_cost: number;
    pur_date: string;
  }[];
  const meds = (medsResult.data ?? []) as {
    med_id: number;
    med_name: string;
    med_qty: number;
    category: string | null;
    med_price: number;
  }[];
  const expiringRows = (expiryResult.data ?? []) as {
    p_id: number;
    med_name: string;
    exp_date: string;
    days_left: number;
    p_qty: number;
    med_id: number;
  }[];

  const revenue = sales.reduce((sum, row) => sum + Number(row.total_amt ?? 0), 0);
  const previousRevenue = previousSales.reduce(
    (sum, row) => sum + Number(row.total_amt ?? 0),
    0,
  );
  const itemsSold = items.reduce((sum, row) => sum + Number(row.sale_qty ?? 0), 0);
  const uniqueCustomers = new Set(
    sales.map((row) => row.c_id).filter((id): id is number => id !== null),
  ).size;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayRows = sales.filter((row) => new Date(row.sold_at) >= startOfToday);
  const spendFrom = dayKey(range.start);

  const productMap = new Map<number, ProductRow>();
  const categoryMap = new Map<string, number>();
  for (const item of items) {
    const name = item.meds?.med_name ?? `Medicine #${item.med_id}`;
    const category = item.meds?.category ?? "Uncategorised";
    const current = productMap.get(item.med_id) ?? {
      med_id: item.med_id,
      name,
      category: item.meds?.category ?? null,
      units: 0,
      revenue: 0,
    };
    current.units += Number(item.sale_qty ?? 0);
    current.revenue += Number(item.tot_price ?? 0);
    productMap.set(item.med_id, current);
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + Number(item.tot_price ?? 0));
  }

  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const categoryMix: SeriesPoint[] = categories.slice(0, 5).map(([label, value]) => ({
    label,
    value,
  }));
  const otherCategories = categories
    .slice(5)
    .reduce((sum, [, value]) => sum + value, 0);
  if (otherCategories > 0) categoryMix.push({ label: "Other", value: otherCategories });

  // `purchase.p_cost` is the cost of the whole batch, so the unit cost is
  // p_cost / p_qty. The latest batch per medicine is used, which keeps the
  // margin meaningful even when the window itself contains no purchases.
  const unitCost = new Map<number, number>();
  for (const purchase of purchases) {
    const quantity = Number(purchase.p_qty ?? 0);
    if (!unitCost.has(purchase.med_id) && quantity > 0) {
      unitCost.set(purchase.med_id, Number(purchase.p_cost ?? 0) / quantity);
    }
  }
  const cogs = items.reduce(
    (sum, item) => sum + (unitCost.get(item.med_id) ?? 0) * Number(item.sale_qty ?? 0),
    0,
  );

  return {
    revenue,
    previousRevenue,
    invoices: sales.length,
    previousInvoices: previousSales.length,
    itemsSold,
    averageBasket: sales.length > 0 ? revenue / sales.length : 0,
    uniqueCustomers,
    todayRevenue: todayRows.reduce((sum, row) => sum + Number(row.total_amt ?? 0), 0),
    todayInvoices: todayRows.length,
    dailySeries: buildSeries(sales, range),
    recentSpark: buildSeries(sales, range)
      .slice(-14)
      .map((point) => point.value),
    weekdaySeries: buildWeekdaySeries(sales),
    topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    categoryMix,
    inventoryCount: meds.length,
    inventoryValue: meds.reduce(
      (sum, med) => sum + Number(med.med_qty ?? 0) * Number(med.med_price ?? 0),
      0,
    ),
    lowStockCount: meds.filter((med) => med.med_qty <= 50).length,
    outOfStockCount: meds.filter((med) => med.med_qty <= 0).length,
    expiring30: expiringRows.filter((row) => row.days_left >= 0 && row.days_left <= 30).length,
    expiring90: expiringRows.filter((row) => row.days_left >= 0 && row.days_left <= 90).length,
    purchaseSpend: purchases
      .filter((row) => row.pur_date >= spendFrom)
      .reduce((sum, row) => sum + Number(row.p_cost ?? 0), 0),
    estimatedMargin: revenue > 0 ? revenue - cogs : 0,
    customerCount: customerResult.count ?? 0,
    newCustomers: newCustomerResult.count ?? 0,
    employeeCount: employeeResult.count ?? 0,
    lowStock: meds
      .filter((med) => med.med_qty <= 50)
      .sort((a, b) => a.med_qty - b.med_qty)
      .slice(0, 6),
    expiring: expiringRows
      .filter((row) => row.days_left <= 90)
      .sort((a, b) => a.days_left - b.days_left)
      .slice(0, 6),
    recentSales: (recentSalesResult.data ?? []) as unknown as DashboardAnalytics["recentSales"],
    activity: (activityResult.data ?? []) as ActivityRow[],
    auditAvailable: !activityResult.error,
  };
}

/** Age of an item in days, used to colour expiry badges. */
export function daysUntil(value: string): number {
  return Math.ceil((Date.parse(value) - Date.now()) / DAY_MS);
}
