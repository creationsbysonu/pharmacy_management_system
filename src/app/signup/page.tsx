import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Pill } from "lucide-react";
import { AuthProviders } from "@/components/auth-providers";
import { SignupForm } from "@/components/auth-forms";
import { getGate } from "@/lib/auth";
import { signupTarget } from "@/lib/route-rules";

const INCLUDED = [
  "14 days free — no card required",
  "Your own private workspace, nothing shared",
  "Inventory, POS, purchases, customers and reports",
];

export default async function SignupPage() {
  // An account that already works is sent to its home, but only after the
  // database confirms it — see lib/route-rules.ts. A suspended workspace is
  // left on this page: its owner may be here to start over.
  const target = signupTarget(await getGate());
  if (target) redirect(target);

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Pill className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide">PHARMACIA</span>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="font-heading text-3xl leading-tight font-semibold">
            Start your free trial.
          </h1>
          <p className="text-sm text-primary-foreground/80">
            No card, no commitment. Every account gets a private workspace, so
            your medicines, customers and sales are never visible to anyone else.
          </p>
          <ul className="space-y-3 text-sm">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/60">
          After 14 days your workspace stays readable until you subscribe.
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Pill className="size-4" />
            </span>
            <span className="text-sm font-semibold">Pharmacia</span>
          </div>

          <h2 className="font-heading text-xl font-semibold">Create your account</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Start the 14-day free trial. No card required.
          </p>

          <AuthProviders next="/dashboard" googleLabel="Sign up with Google" />

          <SignupForm />

          <p className="mt-4 text-xs text-muted-foreground">
            Nothing is registered until you confirm the address: your pharmacy
            is created the moment the code is entered or the link is opened.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}