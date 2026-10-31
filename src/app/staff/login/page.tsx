import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getGate } from "@/lib/auth";
import { entranceTarget } from "@/lib/route-rules";

export const metadata = { title: "Employee sign in · Pharmacia" };

/**
 * The employee door. It is deliberately a different URL with different copy:
 * the account behind it is a named pharmacist login issued by the pharmacy
 * owner, and it can only reach the counter, stock and customers.
 */
export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Same rule as the owner's door: redirect only a session that can really work.
  const target = entranceTarget(await getGate());
  if (target) redirect(target);

  return (
    <AuthShell
      eyebrow="Employee · counter access"
      title="Your shift starts here."
      description="Bring up the till, look up stock and register a customer. Everything else belongs to the pharmacy owner."
      points={[
        "Your own named login — no shared password",
        "Point of sale, stock lookup and customers",
        "Cannot touch reports, salaries or settings",
      ]}
      footer={
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-xs">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              Own the pharmacy?{" "}
              <Link className="font-medium text-foreground underline underline-offset-4" href="/login">
                Use the administrator sign-in
              </Link>
              .
            </span>
          </div>

          <p className="text-xs">
            No login yet? Ask your pharmacy administrator to add you from the
            employee register — they set your temporary password.
          </p>
        </div>
      }
    >
      <h2 className="font-heading text-xl font-semibold">Employee sign in</h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Use the work email your pharmacy registered for you — with the temporary
        password your administrator set. Logins here are issued by the pharmacy,
        not by Google.
      </p>

      {error ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{decodeURIComponent(error)}</span>
        </p>
      ) : null}

      <LoginForm nextPath={next ?? "/pos"} portal="staff" submitLabel="Open the counter" />
    </AuthShell>
  );
}
