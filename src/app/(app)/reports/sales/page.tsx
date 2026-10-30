import Link from "next/link";
import { CalendarRange, Download, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart } from "@/components/charts";
import { ExportButtons } from "@/components/export-buttons";
import { EmptyRow, PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { dateLabel, dateTimeLabel, money, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const MONTH_START = `${new Date().toISOString().slice(0, 7)}-01`;

interface ReportSale {
  sale_id: number;
  sold_at: string;
  total_amt: number;
  customer: { c_fname: string; c_lname: string | null } | null;
}

interface ReportItem {
  sale_id: number;
  med_id: number;
  sale_qty: number;
  tot_price: number;
  meds: { med_name: string } | null;
}

/** Keeps PostgREST URLs short: at most 100 ids per request. */
async function fetchItems(saleIds: number[]): Promise<ReportItem[]> {
  if (saleIds.length === 0) return [];
  const supabase = await createClient();
  const chunks: number[][] = [];
  for (let index = 0; index < saleIds.length; index += 100) {
    chunks.push(saleIds.slice(index, index + 100));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("sales_items")
        .select("sale_id, med_id, sale_qty, tot_price, meds!sales_items_med_workspace_fk(med_name)")
        .in("sale_id", chunk),
    ),
  );

  return results.flatMap((result) => (result.data ?? []) as unknown as ReportItem[]);
}

function dailySeries(sales: ReportSale[]): { label: string; value: number }[] {
  const buckets = new Map<string, number>();
  for (const sale of sales) {
    const date = new Date(sale.sold_at);
    const key = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(sale.total_amt ?? 0));
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .reverse();
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const from = params.from || MONTH_START;
  const to = params.to || todayISO();

  const supabase = await createClient();

  const { data: salesData, error } = await supabase
    .from("sales")
    .select("sale_id, sold_at, total_amt, customer!sales_customer_workspace_fk(c_fname, c_lname)")
    .gte("sold_at", `${from}T00:00:00`)
    .lte("sold_at", `${to}T23:59:59`)
    .order("sold_at", { ascending: false })
    .limit(500);

  const sales = (salesData ?? []) as unknown as ReportSale[];
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total_amt ?? 0), 0);
  const average = sales.length > 0 ? revenue / sales.length : 0;
  const items = await fetchItems(sales.map((sale) => sale.sale_id));
  const units = items.reduce((sum, item) => sum + Number(item.sale_qty ?? 0), 0);

  const grouped = new Map<number, { name: string; units: number; revenue: number }>();
  for (const item of items) {
    const current = grouped.get(item.med_id) ?? {
      name: item.meds?.med_name ?? `Medicine #${item.med_id}`,
      units: 0,
      revenue: 0,
    };
    current.units += Number(item.sale_qty ?? 0);
    current.revenue += Number(item.tot_price ?? 0);
    grouped.set(item.med_id, current);
  }
  const topMedicines = [...grouped.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const exportHref = `/reports/export?type=sales&from=${from}&to=${to}`;
  const rangeDays = Math.max(
    1,
    Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1,
  );

  return (
    <>
      <PageHeader
        title="Sales report"
        description={`${dateLabel(from)} → ${dateLabel(to)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <a href={exportHref}>
                <Download /> CSV
              </a>
            </Button>
            <ExportButtons kind="sales" range={rangeDays} />
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" action="/reports/sales">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={from} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={to} />
            </div>
            <Button type="submit">
              <CalendarRange /> Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Wallet className="size-3.5" /> Revenue
            </CardDescription>
            <CardTitle className="numeric text-2xl">{money(revenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Receipt className="size-3.5" /> Invoices
            </CardDescription>
            <CardTitle className="numeric text-2xl">{sales.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="size-3.5" /> Average invoice
            </CardDescription>
            <CardTitle className="numeric text-2xl">{money(average)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Units sold</CardDescription>
            <CardTitle className="numeric text-2xl">{units}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Revenue by day</CardTitle>
          <CardDescription>Invoiced total per day in this window.</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart
            points={dailySeries(sales)}
            formatValue={(value) => money(value)}
            ariaLabel="Revenue by day"
            height={210}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoices in range</CardTitle>
            <CardDescription>The 500 most recent in this window.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {error ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">{error.message}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="pr-4 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <EmptyRow colSpan={4} message="No sales in this period." />
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.sale_id}>
                        <TableCell className="pl-4">
                          <Link
                            className="font-medium hover:underline"
                            href={`/sales/${sale.sale_id}`}
                          >
                            #{sale.sale_id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {sale.customer
                            ? `${sale.customer.c_fname} ${sale.customer.c_lname ?? ""}`.trim()
                            : "Walk-in"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dateTimeLabel(sale.sold_at)}
                        </TableCell>
                        <TableCell className="numeric pr-4 text-right">
                          {money(sale.total_amt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-4 font-medium" colSpan={3}>
                      Total
                    </TableCell>
                    <TableCell className="numeric pr-4 text-right">{money(revenue)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best sellers</CardTitle>
            <CardDescription>Ranked by revenue in this window.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Medicine</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="pr-4 text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMedicines.length === 0 ? (
                  <EmptyRow colSpan={3} message="Nothing sold in this period." />
                ) : (
                  topMedicines.map((med) => (
                    <TableRow key={med.name}>
                      <TableCell className="pl-4 font-medium">{med.name}</TableCell>
                      <TableCell className="numeric text-right">{med.units}</TableCell>
                      <TableCell className="numeric pr-4 text-right">
                        {money(med.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
