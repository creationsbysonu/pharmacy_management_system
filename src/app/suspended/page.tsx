import Link from "next/link";
import { Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export const metadata = { title: "Workspace suspended · Pharmacia" };

/**
 * A suspended workspace keeps every row, but cannot be entered. Suspension is
 * an operator action, so this page explains who to contact rather than offering
 * a self-service route back in.
 */
export default function SuspendedPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-16">
      <div className="aurora opacity-50" aria-hidden />

      <div className="glass-strong relative w-full max-w-md rounded-3xl border border-border p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
          <ShieldAlert className="size-6" />
        </span>

        <h1 className="font-heading mt-5 text-2xl font-semibold">This workspace is paused</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Access has been suspended by the platform operator. Nothing has been
          deleted — stock, sales, customers and staff records are all intact and
          will be here when the workspace is reopened.
        </p>

        <ul className="mt-4 space-y-2 rounded-2xl border border-border bg-background/40 p-4 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <Mail className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Reply to the operator who contacted you to reopen access.
          </li>
          <li className="flex items-start gap-2">
            <Mail className="mt-0.5 size-3.5 shrink-0 text-primary" />
            If this is unexpected, sign in again later or ask the pharmacy owner
            to check the billing status.
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">Back to the site</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost">Sign out</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
