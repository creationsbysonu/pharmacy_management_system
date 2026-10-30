import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Users } from "lucide-react";
import { AuthProviders } from "@/components/auth-providers";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getGate } from "@/lib/auth";
import { entranceTarget } from "@/lib/route-rules";

export const metadata = { title: "Administrator sign in · Pharmacia" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Only send an account onward once it provably has a workspace: a session
  // whose membership was removed must still see this form, not a redirect loop.
  const target = entranceTarget(await getGate());
  if (target) redirect(target);

  return (
    <AuthShell
      eyebrow="Administrator · pharmacy owner"
      title="The owner's desk."
      description="Sign in to run the pharmacy: stock, purchases, staff, money and the reports that go with them."
      points={[
        "Full control of one private workspace",
        "Add employees and issue or revoke their logins",
        "Every change recorded in the audit trail",
      ]}
      footer={
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-xs">
            <Users className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              Work at the counter?{" "}
              <Link className="font-medium text-foreground underline underline-offset-4" href="/staff/login">
                Use the employee sign-in
              </Link>
              .
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Link className="text-xs hover:text-foreground" href="/signup">
              Start a free trial
            </Link>
            <Link className="text-xs hover:text-foreground" href="/">
              Back to the site
            </Link>
          </div>
        </div>
      }
    >
      <h2 className="font-heading text-xl font-semibold">Administrator sign in</h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Use the email and password of the account that owns this pharmacy.
      </p>

      {error ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{decodeURIComponent(error)}</span>
        </p>
      ) : null}

      <AuthProviders next={next ?? "/dashboard"} />

      <LoginForm nextPath={next ?? "/dashboard"} portal="admin" submitLabel="Enter the dashboard" />
    </AuthShell>
  );
}
