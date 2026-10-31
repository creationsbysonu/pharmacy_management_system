import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PharmacyProfileForm } from "@/components/settings-forms";
import { signOut } from "@/lib/actions/auth";
import { getAccess, getGate } from "@/lib/auth";
import { loadPharmacyProfile } from "@/lib/pharmacy";
import { nextFor } from "@/lib/route-rules";

export const metadata = { title: "Create your organization · Pharmacia" };

/**
 * The last stop before the dashboard for an administrator whose organization
 * has never been described — which is what a Google sign-up produces, since
 * Google carries no pharmacy name, and what a blank sign-up form produces too.
 *
 * It lives *outside* the (app) group on purpose: the app layout's guard would
 * otherwise redirect this very page to itself. So it runs the shared rule here
 * instead — `nextFor("/organization", …)` answers `null` only for the session
 * this page is for, and sends every other state somewhere that explains it.
 */
export default async function OrganizationPage() {
  const gate = await getGate();
  const target = nextFor("/organization", gate);
  if (target) redirect(target);

  const access = await getAccess();
  if (!access) redirect("/no-access");

  const profile = await loadPharmacyProfile(access.workspaceId);
  const contactMissing = profile !== null && !profile.hasContactFields;

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden p-6">
      <div className="aurora opacity-40" aria-hidden />

      <Card className="glass-strong relative w-full max-w-lg border-border">
        <CardHeader>
          <span className="mb-2 flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          <CardTitle>Name your organization</CardTitle>
          <CardDescription>
            Your account is verified, but no pharmacy has been described yet.
            Give this workspace its real name and contact details — they print on
            every invoice and appear in the app heading — and the dashboard opens
            straight afterwards.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {contactMissing ? (
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              <MailWarning className="mt-0.5 size-4 shrink-0" />
              <span>
                Organization settings are not installed yet — run{" "}
                <code className="rounded bg-background px-1 py-0.5 text-xs">
                  supabase/setup.sql
                </code>{" "}
                (or migration 0006) in the Supabase SQL editor, then reload.
              </span>
            </p>
          ) : null}

          {profile ? (
            <PharmacyProfileForm profile={profile} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This workspace could not be read. Reload the page, or sign out and
              back in.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Signed in as {access.user.email}
            </p>
            <div className="flex gap-2">
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Back to the site</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
