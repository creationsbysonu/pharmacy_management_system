import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart, BarChart } from "@/components/charts";
import { DeleteButton } from "@/components/delete-button";
import { EmptyRow, Notice, PageHeader } from "@/components/page-header";
import { deleteSale } from "@/lib/actions/sales";
import { requireProfile } from "@/lib/auth";
import { dateTimeLabel, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Sale } from "@/lib/types";

interface SaleRow extends Sale {
  customer: { c_fname: string; c_lname: string | null } | null;
  employee: { e_fname: string; e_lname: string | null } | null;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok: okMessage } = await searchParams;
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select(
      "sale_id, c_id, e_id, sold_at, total_amt, customer!sales_customer_workspace_fk(c_fname, c_lname), employee!sales_employee_workspace_fk(e_fname, e_lname)"
    )
    .order("sold_at", { ascending: false })
    .limit(200);

  const sales = (data ?? []) as unknown as SaleRow[];
  const total = sales.reduce((sum, row) => sum + Number(row.total_amt ?? 0), 0);
  const isAdmin = profile.role === "admin";

  // The counter's own analytics: what the last two weeks looked like and when
  // the shop gets busy. Both are built from the rows already on this page, so
  // an employee can read them without any extra permission.
  const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });
  // One clock read per request; this is a server component, rendered once.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now - (13 - index) * 86_400_000);
    return {
      key: date.toISOString().slice(0, 10),
      label: dayLabel.format(date),
      value: 0,
    };
  });
  const trendIndex = new Map(trend.map((day) => [day.key, day]));

  const hours = Array.from({ length: 12 }, (_, index) => {
    const hour = index + 9; // 09:00 – 20:00, the hours a pharmacy actually trades
    return { label: `${String(hour).padStart(2, "0")}`, value: 0 };
  });

  for (const sale of sales) {
    const amount = Number(sale.total_amt ?? 0);
    const bucket = trendIndex.get(String(sale.sold_at).slice(0, 10));
    if (bucket) bucket.value += amount;

    const hour = new Date(sale.sold_at).getHours();
    const slot = hours[hour - 9];
    if (slot) slot.value += 1;
  }

  return (
    <>
      <PageHeader
        title="Sales"
        description={`${sales.length} most recent invoices · ${money(total)}`}
        actions={
          <Button asChild>
            <Link href="/pos">
              <ShoppingCart />
              New sale
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <Notice message={error} />
        </div>
      ) : null}
      {okMessage ? (
        <div className="mb-4">
          <Notice message={okMessage} />
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">Takings, last 14 days</p>
              <span className="numeric text-xs text-muted-foreground">
                {money(trend.reduce((sum, day) => sum + day.value, 0))}
              </span>
            </div>
            <AreaChart
              points={trend.map((day) => ({ label: day.label, value: Math.round(day.value) }))}
              formatValue={(value) => money(value)}
              ariaLabel="Daily takings for the last fourteen days"
              height={180}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="mb-2 text-sm font-medium">When the counter is busiest</p>
            <BarChart
              items={hours}
              ariaLabel="Invoices per hour of the day"
              height={180}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Invoices by hour, from the sales on this page.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <EmptyRow colSpan={6} message="No sales recorded yet." />
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.sale_id}>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" href={`/sales/${sale.sale_id}`}>
                        #{sale.sale_id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateTimeLabel(sale.sold_at)}
                    </TableCell>
                    <TableCell>
                      {sale.customer
                        ? `${sale.customer.c_fname} ${sale.customer.c_lname ?? ""}`.trim()
                        : "Walk-in"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.employee
                        ? `${sale.employee.e_fname} ${sale.employee.e_lname ?? ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(sale.total_amt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/sales/${sale.sale_id}`}>View</Link>
                        </Button>
                        {isAdmin ? (
                          <DeleteButton
                            iconOnly
                            action={deleteSale.bind(null, sale.sale_id)}
                            title={`Delete sale #${sale.sale_id}?`}
                            description="The sold quantities go back into stock. This cannot be undone."
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
