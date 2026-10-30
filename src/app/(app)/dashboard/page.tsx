import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  PackageSearch,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart, BarChart, DonutChart, MeterRow, Sparkline } from "@/components/charts";
import { ExportButtons } from "@/components/export-buttons";
import { PremiumLock } from "@/components/premium-lock";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/marketing-motion";
import { EmptyRow } from "@/components/page-header";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RANGE_OPTIONS, deltaOf, loadDashboard, parseRange, rangeLabel } from "@/lib/analytics";
import { dateLabel, dateTimeLabel, money } from "@/lib/format";
import { cn } from "@/lib/utils";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Delta({ value }: { value: number }) {
  const rounded = Math.round(value * 10) / 10;
  if (!Number.isFinite(rounded) || rounded === 0) {
    return <span className="text-xs text-muted-foreground">No change</span>;
  }
  const up = rounded > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        up ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(rounded)}%
    </span>
  );
}

/** Shared bento shell: consistent radius, border, hover and padding. */
function Bento({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "hero" | "plain";
}) {
  return (
    <section
      className={cn(
        "card-lift relative overflow-hidden rounded-2xl border bg-card p-5",
        tone === "hero" && "bg-gradient-to-br from-primary/8 via-card to-chart-2/8",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Kpi({
  title,
  value,
  hint,
  delta,
  icon: Icon,
  spark,
  kind = "number",
}: {
  title: string;
  value: number;
  hint: string;
  delta?: number;
  icon: React.ComponentType<{ className?: string }>;
  spark?: number[];
  kind?: "number" | "currency" | "compact";
}) {
  return (
    <Bento>
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        {typeof delta === "number" ? <Delta value={delta} /> : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{title}</p>
      <p className="numeric font-heading text-2xl font-semibold">
        <CountUp value={value} kind={kind} />
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{hint}</p>
        {spark && spark.length > 2 ? (
          <Sparkline values={spark} positive={(delta ?? 0) >= 0} className="h-6 w-16" />
        ) : null}
      </div>
    </Bento>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const access = await requireAccess();
  const params = await searchParams;

  const requested = parseRange(params.range);
  let range = requested;
  let autoExtended = false;

  // One cheap probe decides whether the window has anything to show, so a
  // dormant workspace never pays for a full load twice.
  if (!requested.allTime) {
    const supabase = await createClient();
    const { data: latest } = await supabase
      .from("sales")
      .select("sold_at")
      .order("sold_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ sold_at: string }>();

    const latestAt = latest?.sold_at ? Date.parse(latest.sold_at) : 0;
    if (!latestAt || latestAt < requested.start.getTime()) {
      range = parseRange("all");
      autoExtended = true;
    }
  }

  const data = await loadDashboard(range);

  const compare = !range.allTime && !autoExtended;
  const revenueDelta = compare ? deltaOf(data.revenue, data.previousRevenue) : undefined;
  const invoiceDelta = compare ? deltaOf(data.invoices, data.previousInvoices) : undefined;
  const firstName = (access.profile.full_name ?? "").trim().split(" ")[0];

  const alertCount = data.lowStockCount + data.expiring30;

  return (
    <>
      {access.readOnly ? <PremiumLock access={access} /> : null}

      {/* -------------------------------------------------------------- header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/settings"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            title="This organization"
          >
            <Building2 className="size-3 shrink-0 text-primary" />
            <span className="max-w-[46ch] truncate">{access.pharmacyName}</span>
          </Link>
          <h1 className="font-heading mt-1.5 text-2xl font-semibold tracking-tight">
            {rangeLabel(range)}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            {greeting()}
            {firstName ? `, ${firstName}` : ""} ·{" "}
            {access.profile.role === "admin" ? "Administrator" : "Pharmacist"}
            {autoExtended
              ? ` · no sales in the last ${requested.days} days, showing all time`
              : ` · ${data.invoices} invoices · ${data.todayInvoices} today`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option}
                asChild
                size="sm"
                variant={range.key === String(option) ? "default" : "ghost"}
                className="rounded-lg"
              >
                <Link href={`/dashboard?range=${option}`} prefetch>
                  {option}d
                </Link>
              </Button>
            ))}
            <Button
              asChild
              size="sm"
              variant={range.allTime ? "default" : "ghost"}
              className="rounded-lg"
            >
              <Link href="/dashboard?range=all" prefetch>
                All
              </Link>
            </Button>
          </div>
          {access.profile.role === "admin" ? (
            <ExportButtons kind="sales" range={range.allTime ? 3650 : range.days} />
          ) : null}
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/pos">
              <Plus /> New sale
            </Link>
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- bento */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
        {/* Hero: revenue + trend */}
        <Reveal className="sm:col-span-2 xl:col-span-5" motion="scale">
          <Bento tone="hero" className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-3.5" /> Revenue
                </p>
                <p className="numeric font-heading mt-1 text-4xl font-semibold tracking-tight">
                  <CountUp value={data.revenue} kind="currency" />
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {typeof revenueDelta === "number" ? <Delta value={revenueDelta} /> : null}
                  {compare
                    ? `vs ${money(data.previousRevenue)} before`
                    : `${data.invoices} invoices in view`}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {range.allTime ? "All time" : `Last ${range.days}d`}
              </Badge>
            </div>

            <AreaChart
              points={data.dailySeries}
              formatValue={(value) => money(value)}
              ariaLabel={`Revenue trend for ${rangeLabel(range)}`}
              height={200}
              className="mt-4"
            />
          </Bento>
        </Reveal>

        <Reveal className="xl:col-span-3" delay={40}>
          <Kpi
            title="Invoices"
            value={data.invoices}
            hint={`${data.todayInvoices} today · ${money(data.todayRevenue)}`}
            delta={invoiceDelta}
            icon={Receipt}
          />
        </Reveal>

        <Reveal className="xl:col-span-2" delay={60}>
          <Kpi
            title="Avg basket"
            value={data.averageBasket}
            kind="currency"
            hint={`${data.itemsSold} units sold`}
            icon={TrendingUp}
            spark={data.recentSpark}
          />
        </Reveal>

        <Reveal className="xl:col-span-2" delay={80}>
          <Kpi
            title="Est. margin"
            value={data.estimatedMargin}
            kind="currency"
            hint={`${money(data.purchaseSpend)} purchases`}
            icon={ShoppingCart}
          />
        </Reveal>

        {/* Needs attention */}
        <Reveal className="sm:col-span-2 xl:col-span-4" delay={100}>
          <Bento className="h-full">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="size-4 text-warning" /> Needs attention
              </p>
              <Badge variant={alertCount > 0 ? "destructive" : "secondary"}>
                {alertCount} item{alertCount === 1 ? "" : "s"}
              </Badge>
            </div>

            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
                <span className="flex items-center gap-2">
                  <PackageSearch className="size-3.5 text-warning" /> Low stock
                </span>
                <Link href="/reports/stock" className="numeric text-xs font-medium hover:underline">
                  {data.lowStockCount} to reorder <ArrowRight className="inline size-3" />
                </Link>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
                <span className="flex items-center gap-2">
                  <CalendarClock className="size-3.5 text-destructive" /> Expiring ≤30d
                </span>
                <Link href="/reports/expiry" className="numeric text-xs font-medium hover:underline">
                  {data.expiring30} batches <ArrowRight className="inline size-3" />
                </Link>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
                <span className="flex items-center gap-2">
                  <Wallet className="size-3.5 text-primary" /> Plan
                </span>
                <Link href="/settings" className="text-xs font-medium hover:underline">
                  {access.plan === "trial" ? `${access.daysLeft ?? 0} days left` : "Subscribed"}
                </Link>
              </li>
            </ul>

            {data.lowStock.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {data.lowStock.slice(0, 3).map((med) => (
                  <div key={med.med_id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{med.med_name}</span>
                    <span
                      className={cn(
                        "numeric rounded-full px-1.5 py-0.5",
                        med.med_qty <= 20 ? "bg-destructive/10 text-destructive" : "bg-muted",
                      )}
                    >
                      {med.med_qty}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </Bento>
        </Reveal>

        {/* Top medicines */}
        <Reveal className="sm:col-span-2 xl:col-span-4" delay={120}>
          <Bento className="h-full">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Top medicines</p>
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Link href="/reports/sales">Report</Link>
              </Button>
            </div>
            <ul className="mt-3 space-y-2.5">
              {data.topProducts.length === 0 ? (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  Nothing sold in this period.
                </li>
              ) : (
                data.topProducts.slice(0, 5).map((product) => (
                  <li key={product.med_id} className="flex items-center gap-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{product.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {product.units} units · {product.category ?? "Uncategorised"}
                      </span>
                    </span>
                    <span className="numeric shrink-0 text-xs font-medium">
                      {money(product.revenue)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Bento>
        </Reveal>

        {/* Category mix */}
        <Reveal className="xl:col-span-4" delay={140}>
          <Bento className="h-full">
            <p className="text-sm font-medium">Category mix</p>
            <p className="text-[11px] text-muted-foreground">Share of revenue</p>
            <DonutChart
              items={data.categoryMix}
              formatValue={(value) => money(value)}
              className="mt-3"
            />
          </Bento>
        </Reveal>

        {/* Stock health */}
        <Reveal className="sm:col-span-2 xl:col-span-4" delay={160}>
          <Bento className="h-full">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Stock health</p>
              <span className="numeric text-xs text-muted-foreground">
                {money(data.inventoryValue)}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              <MeterRow
                label="Well stocked"
                value={Math.max(0, data.inventoryCount - data.lowStockCount)}
                max={Math.max(data.inventoryCount, 1)}
                hint={`${data.inventoryCount - data.lowStockCount} of ${data.inventoryCount}`}
              />
              <MeterRow
                label="Below reorder line"
                value={data.lowStockCount}
                max={Math.max(data.inventoryCount, 1)}
                hint={`${data.lowStockCount} lines`}
                tone="warning"
              />
              <MeterRow
                label="Out of stock"
                value={data.outOfStockCount}
                max={Math.max(data.inventoryCount, 1)}
                hint={`${data.outOfStockCount} lines`}
                tone="destructive"
              />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {data.inventoryCount} medicines · {data.expiring90} expiring within 90 days
            </p>
          </Bento>
        </Reveal>

        {/* Busiest days */}
        <Reveal className="sm:col-span-2 xl:col-span-4" delay={180}>
          <Bento className="h-full">
            <p className="text-sm font-medium">Busiest days</p>
            <p className="text-[11px] text-muted-foreground">Revenue by weekday</p>
            <BarChart
              items={data.weekdaySeries}
              formatValue={(value) => money(value)}
              ariaLabel="Revenue by weekday"
              height={172}
              className="mt-2"
            />
          </Bento>
        </Reveal>

        {/* Activity */}
        <Reveal className="sm:col-span-2 xl:col-span-4" delay={200}>
          <Bento className="h-full">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Activity</p>
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Link href="/activity">All</Link>
              </Button>
            </div>
            <div className="mt-3 space-y-2.5">
              {data.activity.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {data.auditAvailable
                    ? "No changes recorded yet."
                    : "Run migration 0004 to start the audit trail."}
                </p>
              ) : (
                data.activity.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate">
                        <span className="font-medium capitalize">{entry.action}</span>{" "}
                        <span className="text-muted-foreground">
                          {entry.entity.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {entry.actor_email ?? "System"} · {dateTimeLabel(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Bento>
        </Reveal>

        {/* Expiring batches */}
        <Reveal className="sm:col-span-2 xl:col-span-4" delay={220}>
          <Bento className="h-full">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="size-4 text-destructive" /> Expiring soon
              </p>
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Link href="/reports/expiry">All</Link>
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {data.expiring.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No batches expiring soon.
                </p>
              ) : (
                data.expiring.slice(0, 5).map((batch) => (
                  <div key={batch.p_id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="block truncate">{batch.med_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {dateLabel(batch.exp_date)} · {batch.p_qty} units
                      </span>
                    </span>
                    <Badge
                      variant={batch.days_left <= 30 ? "destructive" : "outline"}
                      className="shrink-0 text-[10px]"
                    >
                      {batch.days_left < 0 ? "Expired" : `${batch.days_left}d`}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Bento>
        </Reveal>

        {/* Recent sales */}
        <Reveal className="sm:col-span-2 xl:col-span-12" delay={240}>
          <Bento>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Recent sales</p>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <Users className="size-3.5" /> {data.customerCount} customers ·{" "}
                  {data.employeeCount} staff
                </span>
                <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                  <Link href="/sales">
                    All sales <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>
            </div>

            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-1">Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">When</TableHead>
                  <TableHead className="pr-1 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSales.length === 0 ? (
                  <EmptyRow colSpan={4} message="No sales recorded yet." />
                ) : (
                  data.recentSales.map((sale) => (
                    <TableRow key={sale.sale_id}>
                      <TableCell className="pl-1">
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
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {dateTimeLabel(sale.sold_at)}
                      </TableCell>
                      <TableCell className="numeric pr-1 text-right">
                        {money(sale.total_amt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Bento>
        </Reveal>
      </div>

      <p className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <CircleDollarSign className="size-3.5" />
        Margin is estimated from the latest purchase price per medicine. Figures
        update as sales and deliveries are recorded.
      </p>
    </>
  );
}
