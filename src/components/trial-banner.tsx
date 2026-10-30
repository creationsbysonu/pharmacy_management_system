import Link from "next/link";
import { ArrowRight, Clock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL_DAYS, type Access } from "@/lib/auth";

function endLabel(access: Access): string {
  if (!access.trialEndsAt) return "";
  return new Date(access.trialEndsAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Sits under the top bar. Hidden entirely for paying plans, loud once a trial
 * has lapsed (read-only), quiet while it is still counting down.
 */
export function TrialBanner({ access }: { access: Access }) {
  if (access.plan !== "trial") return null;

  if (access.readOnly) {
    return (
      <div className="border-b border-destructive/30 bg-gradient-to-r from-destructive/12 via-destructive/5 to-transparent px-4 py-2.5 md:px-6">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          <strong className="text-destructive">
            Your {TRIAL_DAYS}-day trial ended on {endLabel(access)} — changes are locked.
          </strong>
          <span className="text-muted-foreground">
            Nothing has been deleted. Reports and exports still work.
          </span>
          <Button asChild size="sm" className="ml-auto gap-1.5">
            <Link href="/upgrade">
              Unlock premium <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-card/40 px-4 py-2 md:px-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Clock className="size-4 shrink-0 text-primary" />
        <strong>
          Free trial — {access.daysLeft} day{access.daysLeft === 1 ? "" : "s"} left
        </strong>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3.5" />
          ends {endLabel(access)}
        </span>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href="/upgrade">Keep your workspace</Link>
        </Button>
      </div>
    </div>
  );
}
