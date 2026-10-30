import {
  Banknote,
  Building2,
  CalendarClock,
  MailCheck,
  ShieldAlert,
} from "lucide-react";
import { AreaChart, BarChart, DonutChart, MeterRow } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { dateLabel, money } from "@/lib/format";
import { ADMIN_KEY_HINT, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface WorkspaceRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  created_at: string;
}

const MONTHLY_VALUE: Record<string, number> = {
  monthly: 999,
  yearly: 9999 / 12,
  lifetime: 0,
};

const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", { month: "short" });
const DAY_LABEL = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

export default async function OperatorAnalyticsPage() {
  const admin = createAdminClient();
  if (!admin) {
    return (
      <p className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
        {ADMIN_KEY_HINT}
      </p>
    );
  }

  // Read the clock once: this server component renders per request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const since = new Date(now - 29 * 86_400_000);

  const [{ data: workspaceData }, { data: saleData }, { count: emailCount }] =
    await Promise.all([
      admin
        .from("workspaces")
        .select("id, name, plan, status, trial_ends_at, created_at")
        .order("created_at", { ascending: true }),
      admin
        .from("sales")
        .select("sold_at, total_amt, workspace_id")
        .gte("sold_at", since.toISOString())
        .limit(20000),
      admin
        .from("invoice_email")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since.toISOString())
        .eq("status", "sent"),
    ]);

  const workspaces = (workspaceData ?? []) as WorkspaceRow[];
  const sales = (saleData ?? []) as {
    sold_at: string;
    total_amt: number;
    workspace_id: string;
  }[];

  // Signups per month, last six months, including the quiet ones.
  const months: { key: string; label: string; value: number }[] = [];
  for (let back = 5; back >= 0; back -= 1) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - back, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    months.push({ key, label: MONTH_LABEL.format(date), value: 0 });
  }
  const monthIndex = new Map(months.map((month) => [month.key, month]));
  for (const workspace of workspaces) {
    const date = new Date(workspace.created_at);
    const bucket = monthIndex.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  }

  // Platform-wide takings per day for the last 30 days.
  const days: { key: string; label: string; value: number }[] = [];
  for (let back = 29; back >= 0; back -= 1) {
    const date = new Date(now - back * 86_400_000);
    days.push({
      key: date.toISOString().slice(0, 10),
      label: DAY_LABEL.format(date),
      value: 0,
    });
  }
  const dayIndex = new Map(days.map((day) => [day.key, day]));
  const revenueByWorkspace = new Map<string, number>();
  let windowRevenue = 0;

  for (const sale of sales) {
    const bucket = dayIndex.get(String(sale.sold_at).slice(0, 10));
    const amount = Number(sale.total_amt ?? 0);
    if (bucket) bucket.value += amount;
    windowRevenue += amount;
    revenueByWorkspace.set(
      sale.workspace_id,
      (revenueByWorkspace.get(sale.workspace_id) ?? 0) + amount,
    );
  }

  const planCounts = ["trial", "monthly", "yearly", "lifetime"].map((plan) => ({
    label: plan,
    value: workspaces.filter((row) => row.plan === plan).length,
  }));
  const statusCounts = ["active", "suspended"].map((status) => ({
    label: status,
    value: workspaces.filter((row) => row.status === status).length,
  }));

  const paying = workspaces.filter((row) => row.plan !== "trial" && row.status === "active");
  const mrr = paying.reduce((sum, row) => sum + (MONTHLY_VALUE[row.plan] ?? 0), 0);
  const trialsEnding = workspaces.filter(
    (row) =>
      row.plan === "trial" &&
      row.trial_ends_at !== null &&
      Date.parse(row.trial_ends_at) > now &&
      Date.parse(row.trial_ends_at) < now + 7 * 86_400_000,
  );
  const lapsed = workspaces.filter(
    (row) =>
      row.plan === "trial" &&
      row.trial_ends_at !== null &&
      Date.parse(row.trial_ends_at) <= now,
  );

  const topPharmacies = [...revenueByWorkspace.entries()]
    .map(([id, value]) => ({
      name: workspaces.find((row) => row.id === id)?.name ?? id.slice(0, 8),
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Platform analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every pharmacy together — growth, plans and money. Individual
            pharmacies never see this view.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          last 30 days · {sales.length} invoices rolled up
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Workspaces"
          value={workspaces.length}
          hint={`${statusCounts[0]?.value ?? 0} active`}
        />
        <StatCard
          icon={Banknote}
          label="Estimated MRR"
          value={Math.round(mrr)}
          kind="currency"
          hint={`${paying.length} paying`}
          tone="primary"
        />
        <StatCard
          icon={MailCheck}
          label="E-bills sent"
          value={emailCount ?? 0}
          hint="invoices emailed in 30 days"
        />
        <StatCard
          icon={CalendarClock}
          label="Trials ending"
          value={trialsEnding.length}
          hint={`${lapsed.length} already lapsed`}
          tone={trialsEnding.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Takings across the platform</h2>
            <span className="numeric text-xs text-muted-foreground">
              {money(windowRevenue)} · 30 days
            </span>
          </div>
          <AreaChart
            points={days.map((day) => ({ label: day.label, value: Math.round(day.value) }))}
            formatValue={(value) => money(value)}
            ariaLabel="Platform sales per day"
            height={210}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-4">
          <h2 className="mb-3 text-sm font-semibold">New pharmacies per month</h2>
          <BarChart
            items={months.map((month) => ({ label: month.label, value: month.value }))}
            formatValue={(value) => `${value} new`}
            ariaLabel="Workspaces created per month"
            height={210}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-4">
          <h2 className="mb-3 text-sm font-semibold">Plan mix</h2>
          <BarChart
            items={planCounts}
            formatValue={(value) => `${value} pharmacies`}
            ariaLabel="Pharmacies per plan"
            height={190}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-4">
          <h2 className="mb-3 text-sm font-semibold">Workspace status</h2>
          <DonutChart
            items={statusCounts}
            formatValue={(value) => `${value} pharmacies`}
          />
          {statusCounts[1] && statusCounts[1].value > 0 ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
              <ShieldAlert className="size-3.5" />
              {statusCounts[1].value} suspended workspace
              {statusCounts[1].value === 1 ? "" : "s"} cannot be entered.
            </p>
          ) : null}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Busiest pharmacies</h2>
          <span className="text-xs text-muted-foreground">sales in the last 30 days</span>
        </div>
        {topPharmacies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No sales recorded across the platform in this window.
          </p>
        ) : (
          <div className="space-y-3">
            {topPharmacies.map((row) => (
              <MeterRow
                key={row.name}
                label={row.name}
                value={Math.round(row.value)}
                max={Math.round(topPharmacies[0].value)}
                hint={money(row.value)}
              />
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Estimated MRR counts active monthly and yearly plans (yearly divided by
        twelve) and excludes lifetime licences and trials. Trials ending within the
        week are listed on the overview page. Generated {dateLabel(new Date(now).toISOString())}.
      </p>
    </div>
  );
}
