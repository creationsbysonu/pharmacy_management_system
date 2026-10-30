import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Fingerprint, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OperatorGateForm } from "@/components/operator-gate-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import {
  getOperatorSession,
  isOperatorEmail,
  operatorConfigured,
} from "@/lib/operator";

export const metadata = { title: "Operator gate · Pharmacia", robots: { index: false } };

/**
 * The entrance to the platform console. It is not a second login: you sign in
 * normally, then prove you are the operator by being on the allowlisted email
 * *and* knowing the passphrase.
 */
export default async function OperatorGatePage() {
  const session = await getOperatorSession();
  if (session) redirect("/superadmin");

  const user = await getCurrentUser();
  const allowed = isOperatorEmail(user?.email);
  const configured = operatorConfigured();

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-16">
      <div className="aurora opacity-60" aria-hidden />
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to pharmacia.app
          </Link>
          <ThemeToggle />
        </div>

        <div className="glass-strong rounded-3xl border border-border p-7 shadow-[0_40px_120px_-60px_oklch(0_0_0_/_1)]">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-chart-5/15 text-chart-5">
            <Lock className="size-5" />
          </span>

          <Badge variant="outline" className="mt-4 border-chart-5/30 text-chart-5">
            Platform operator only
          </Badge>

          <h1 className="font-heading mt-3 text-2xl font-semibold">Super Admin gate</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This console sees every pharmacy on the platform. Two locks guard it:
            an allowlisted email and a private passphrase.
          </p>

          <div className="mt-5 space-y-2 rounded-2xl border border-border bg-background/40 p-4 text-xs">
            <p className="flex items-start gap-2">
              <Fingerprint className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="text-muted-foreground">
                Signed in as{" "}
                <span className="font-medium text-foreground">
                  {user?.email ?? "nobody"}
                </span>
              </span>
            </p>
            <p className="flex items-start gap-2">
              {user && allowed ? (
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
              ) : (
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
              )}
              <span className="text-muted-foreground">
                {!configured
                  ? "The gate is not configured on this deployment."
                  : !user
                    ? "Sign in with the operator account to continue."
                    : allowed
                      ? "This account is on the allowlist."
                      : "This account is not the operator."}
              </span>
            </p>
          </div>

          <div className="mt-5">
            {!configured ? (
              <p className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                Set <code className="font-mono">SUPER_ADMIN_EMAIL</code> and{" "}
                <code className="font-mono">SUPER_ADMIN_PASSCODE</code> in the
                deployment environment, then restart. Optionally set{" "}
                <code className="font-mono">SUPER_ADMIN_SECRET</code> to a long
                random string so the session key is not derived from the passphrase.
              </p>
            ) : !user ? (
              <Button asChild className="h-11 w-full">
                <Link href="/login?next=/superadmin/gate">Sign in first</Link>
              </Button>
            ) : !allowed ? (
              <Button asChild variant="outline" className="h-11 w-full">
                <Link href="/dashboard">Back to the dashboard</Link>
              </Button>
            ) : (
              <OperatorGateForm />
            )}
          </div>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            Every action inside is written to an append-only audit log.
          </p>
        </div>
      </div>
    </main>
  );
}
