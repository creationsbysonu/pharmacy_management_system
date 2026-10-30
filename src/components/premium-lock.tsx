import Link from "next/link";
import { ArrowRight, Lock, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL_DAYS, type Access } from "@/lib/auth";

/**
 * Shown when a trial has lapsed. It does not cover the page: reading, searching
 * and exporting still work, because locking a pharmacy out of its own sale
 * records is how you lose a customer for good. What is locked is every write,
 * which the database enforces independently of this panel.
 */
export function PremiumLock({ access }: { access: Access }) {
  const ended = access.trialEndsAt
    ? new Date(access.trialEndsAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative mb-5 overflow-hidden rounded-3xl border border-warning/25 bg-gradient-to-br from-warning/12 via-card/70 to-transparent p-5">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-warning/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium text-warning">
            <Lock className="size-4" /> Free trial ended{ended ? ` on ${ended}` : ""}
          </p>
          <h2 className="font-heading mt-2 text-xl font-semibold">
            Your workspace is read-only, not gone.
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            After {TRIAL_DAYS} days, changes are locked so nothing new is recorded
            against an unpaid workspace. Every record, report and export still
            works exactly as before, and writes resume the moment a plan is active.
          </p>

          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" /> Data untouched
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" /> Exports still work
            </li>
            <li className="flex items-center gap-1.5">
              <MailCheck className="size-3.5 text-primary" /> Same-day activation
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className="gap-1.5">
            <Link href="/upgrade">
              Unlock premium <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Compare plans</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
