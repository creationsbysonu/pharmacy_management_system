import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  Check,
  Clock3,
  Inbox,
  ShieldAlert,
  CreditCard,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { decideUpgradeRequest } from "@/lib/actions/operator";
import { dateLabel, dateTimeLabel, money } from "@/lib/format";
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

interface RequestRow {
  id: number;
  workspace_id: string;
  plan: string;
  contact_email: string | null;
  note: string | null;
  created_at: string;
}

const MONTHLY_VALUE: Record<string, number> = { monthly: 999, yearly: 9999 / 12, lifetime: 0 };

export default async function OperatorOverview() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="rounded-3xl border border-warning/25 bg-warning/10 p-6">
        <h1 className="font-heading flex items-center gap-2 text-lg font-semibold text-warning">
          <ShieldAlert className="size-5" /> Service role key missing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-warning/90">{ADMIN_KEY_HINT}</p>
        <p className="mt-2 max-w-2xl text-sm text-warning/80">
          The console reads across workspaces, which row level security correctly
          forbids for a normal session. Until the key is present this page cannot
          show or change anything.
        </p>
      </div>
    );
  }

  const [{ data: workspaces }, { data: requests }, { data: audit }] = await Promise.all([
    admin
      .from("workspaces")
      .select("id, name, plan, status, trial_ends_at, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("upgrade_request")
      .select("id, workspace_id, plan, contact_email, note, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("operator_audit")
      .select("id, actor_email, action, target, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rows = (workspaces ?? []) as WorkspaceRow[];
  const pending = (requests ?? []) as RequestRow[];
  // Reading the clock is the whole point of this page; the purity rule targets
  // client components that re-render, which this server component never does.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const inThreeDays = now + 3 * 86_400_000;

  const paying = rows.filter((row) => row.plan !== "trial" && row.status === "active");
  const trialing = rows.filter(
    (row) => row.plan === "trial" && row.status === "active" && (!row.trial_ends_at || Date.parse(row.trial_ends_at) > now),
  );
  const lapsed = rows.filter(
    (row) => row.plan === "trial" && row.trial_ends_at && Date.parse(row.trial_ends_at) <= now,
  );
  const expiringSoon = trialing.filter(
    (row) => row.trial_ends_at && Date.parse(row.trial_ends_at) <= inThreeDays,
  );
  const mrr = paying.reduce((sum, row) => sum + (MONTHLY_VALUE[row.plan] ?? 0), 0);
  const nameById = new Map(rows.map((row) => [row.id, row.name]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-3 border-chart-5/30 text-chart-5">
            Platform
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Everything, at a glance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every pharmacy on Pharmacia, the requests waiting on you, and the trail
            of what has been changed.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/superadmin/requests">
            <Inbox className="size-3.5" /> {pending.length} awaiting review
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Workspaces" value={rows.length} hint={`${trialing.length} on trial`} />
        <StatCard icon={CreditCard} label="Paying" value={paying.length} hint={`${lapsed.length} lapsed`} tone="primary" />
        <StatCard icon={Banknote} label="Estimated MRR" value={Math.round(mrr)} kind="currency" hint="monthly-equivalent" />
        <StatCard
          icon={Clock3}
          label="Trials ending in 3 days"
          value={expiringSoon.length}
          hint={expiringSoon[0] ? expiringSoon[0].name : "nothing urgent"}
          tone={expiringSoon.length > 0 ? "warning" : "default"}
        />
      </div>

      {/* Pending requests ---------------------------------------------------- */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-heading text-lg font-semibold">Upgrade requests</h2>
          <Link href="/superadmin/requests" className="text-xs text-muted-foreground hover:text-foreground">
            See all
          </Link>
        </div>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
            No pharmacy is waiting. New requests appear here the moment they are sent
            from an upgrade page.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((request) => (
              <li key={request.id} className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {nameById.get(request.workspace_id) ?? "Unknown pharmacy"}
                      <Badge className="ml-2 align-middle text-[10px]">{request.plan}</Badge>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.contact_email ?? "no billing email"} · requested{" "}
                      {dateTimeLabel(request.created_at)}
                    </p>
                    {request.note ? (
                      <p className="mt-2 max-w-xl rounded-lg bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                        {request.note}
                      </p>
                    ) : null}
                  </div>

                  <form action={decideUpgradeRequest} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="request_id" value={request.id} />
                    <input
                      name="decision_note"
                      placeholder="Optional note to the pharmacy"
                      className="h-9 w-56 rounded-lg border border-input bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring"
                    />
                    <Button type="submit" name="decision" value="approve" size="sm" className="gap-1.5">
                      <Check className="size-3.5" /> Approve
                    </Button>
                    <Button
                      type="submit"
                      name="decision"
                      value="reject"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive"
                    >
                      <X className="size-3.5" /> Reject
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity ----------------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">Recent operator actions</h2>
            <Link href="/superadmin/audit" className="text-xs text-muted-foreground hover:text-foreground">
              Audit log
            </Link>
          </div>
          {(audit ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nothing yet. Approvals, plan changes and deletions land here.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {(audit ?? []).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{entry.action}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {entry.target ?? "—"} · {entry.actor_email ?? "unknown"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {dateLabel(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <h2 className="font-heading text-sm font-semibold">Trials ending soon</h2>
          {expiringSoon.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nothing expires in the next three days.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {expiringSoon.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate">{row.name}</span>
                  <span className="shrink-0 text-xs text-warning">
                    ends {row.trial_ends_at ? dateLabel(row.trial_ends_at) : "never"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" size="sm" className="mt-4 w-full gap-1.5">
            <Link href="/superadmin/workspaces">
              Manage workspaces <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Estimated MRR uses list prices; {money(Math.round(mrr))} this month.
          </p>
        </div>
      </section>
    </div>
  );
}
