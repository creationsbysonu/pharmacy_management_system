import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock3,
  CreditCard,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plans } from "@/components/plans";
import { UpgradeForm } from "@/components/upgrade-form";
import { requireAccess } from "@/lib/auth";
import { dateLabel, dateTimeLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cancelUpgradeRequest } from "@/lib/actions/upgrade";

export const metadata = { title: "Unlock premium · Pharmacia" };

interface PendingRequest {
  id: number;
  plan: string;
  status: string;
  created_at: string;
  contact_email: string | null;
  decision_note: string | null;
}

const PLAN_LABEL: Record<string, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const access = await requireAccess();
  if (access.profile.role !== "admin") redirect("/dashboard?denied=1");

  const { plan } = await searchParams;
  const selected = ["monthly", "yearly", "lifetime"].includes(plan ?? "")
    ? (plan as string)
    : "monthly";

  const supabase = await createClient();
  const { data: requests, error: requestsError } = await supabase
    .from("upgrade_request")
    .select("id, plan, status, created_at, contact_email, decision_note")
    .eq("workspace_id", access.workspaceId)
    .order("created_at", { ascending: false })
    .limit(3);

  const pending = (requests ?? []).find((row) => row.status === "pending") as
    | PendingRequest
    | undefined;
  const latest = (requests ?? [])[0] as PendingRequest | undefined;
  const isPaid = access.plan !== "trial";

  return (
    <div className="relative">
      <div className="aurora pointer-events-none absolute inset-x-0 -top-24 h-96 opacity-50" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-16 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href={isPaid ? "/dashboard" : "/dashboard"}>
            <ArrowLeft /> Back to the dashboard
          </Link>
        </Button>

        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-4 gap-1.5 border-primary/30 text-primary">
            <CreditCard className="size-3" /> Premium
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {isPaid ? "Your plan is active." : "Keep the pharmacy running."}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {isPaid
              ? `This workspace is on the ${PLAN_LABEL[access.plan] ?? access.plan} plan. Nothing to pay today.`
              : "A plan unlocks every write across the workspace, for as long as you keep it. Your stock, sales and customers stay exactly where they are."}
          </p>
        </div>

        {/* Current state ---------------------------------------------------- */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">Current plan</p>
            <p className="font-heading mt-1 flex items-center gap-2 text-lg font-semibold">
              {PLAN_LABEL[access.plan] ?? (isPaid ? access.plan : "Free trial")}
              <Badge variant={isPaid ? "default" : "outline"} className="text-[10px]">
                {isPaid ? "active" : access.readOnly ? "locked" : "trialing"}
              </Badge>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">Trial</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
              <Clock3 className="size-3.5 text-muted-foreground" />
              {access.trialEndsAt
                ? access.readOnly
                  ? `Ended ${dateLabel(access.trialEndsAt)}`
                  : `${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left`
                : "Not on a trial"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">Writes</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
              {access.readOnly ? (
                <>
                  <TriangleAlert className="size-3.5 text-warning" /> Locked
                </>
              ) : (
                <>
                  <Check className="size-3.5 text-primary" /> Open
                </>
              )}
            </p>
          </div>
        </div>

        {access.readOnly ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Your trial has ended, so the workspace is read-only: nothing has been
              deleted, every report and export still works, and writes resume the
              moment a plan is active.
            </span>
          </p>
        ) : null}

        {/* Pending request -------------------------------------------------- */}
        {pending ? (
          <div className="mt-8 rounded-2xl border border-primary/25 bg-primary/8 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Clock3 className="size-4" />
                  {PLAN_LABEL[pending.plan] ?? pending.plan} request is being reviewed
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sent {dateTimeLabel(pending.created_at)} · we reply to{" "}
                  {pending.contact_email ?? "your account email"}
                </p>
              </div>
              <form action={cancelUpgradeRequest}>
                <input type="hidden" name="request_id" value={pending.id} />
                <Button type="submit" variant="outline" size="sm">
                  Withdraw request
                </Button>
              </form>
            </div>
          </div>
        ) : null}

        {requestsError ? (
          <p className="mt-6 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            Upgrade requests need migration 0005. Run{" "}
            <code className="rounded bg-background px-1 py-0.5 text-xs">
              supabase/migrations/0005_billing_and_operator.sql
            </code>{" "}
            in the Supabase SQL editor to enable this page.
          </p>
        ) : null}

        {/* Plans ------------------------------------------------------------ */}
        <div className="mt-12">
          <h2 className="font-heading text-xl font-semibold">Choose a plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One price per pharmacy. Unlimited employee logins on every plan.
          </p>
          <Plans className="mt-5" />
        </div>

        {/* Request form ----------------------------------------------------- */}
        <div className="mt-10 grid gap-6 rounded-3xl border border-border bg-card/60 p-6 lg:grid-cols-[1.1fr_1fr] lg:p-8">
          <div>
            <h2 className="font-heading text-lg font-semibold">Request activation</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              For now plans are activated by a human, which keeps card details out
              of this app entirely. Send the request and you will get an email when
              the workspace is unlocked — usually the same working day.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "No card is stored in Pharmacia",
                "The plan applies to this workspace only",
                "Data and settings survive any lapse",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            {latest && !pending && latest.status !== "pending" ? (
              <p className="mt-5 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                Last request: {PLAN_LABEL[latest.plan] ?? latest.plan} · {latest.status}
                {latest.decision_note ? ` — ${latest.decision_note}` : ""}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-5">
            <UpgradeForm
              defaultPlan={pending ? pending.plan : selected}
              defaultName={access.profile.full_name ?? ""}
              defaultEmail={access.user.email ?? ""}
              disabled={Boolean(pending) || isPaid}
            />
            {isPaid || pending ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {isPaid
                  ? "This workspace already has an active plan. Contact the operator to change it."
                  : "Withdraw the pending request to send a different one."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
