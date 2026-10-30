import Link from "next/link";
import { redirect } from "next/navigation";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOut } from "@/lib/actions/auth";
import { getCurrentUser, getGate, getProfile } from "@/lib/auth";
import { noAccessTarget } from "@/lib/route-rules";

/**
 * The landing place for a session that is real but does not belong anywhere:
 * no profile row, or a profile whose pharmacy membership was removed.
 *
 * This page must never redirect to the app unless `getAccess` — which checks the
 * profile *and* the membership — actually succeeds. Redirecting on the profile
 * alone is exactly how a deleted membership used to become an endless
 * /dashboard ⇄ /no-access bounce that froze the browser tab.
 */
export default async function NoAccessPage() {
  const gate = await getGate();
  const target = noAccessTarget(gate);
  if (target) redirect(target);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile();

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden p-6">
      <div className="aurora opacity-40" aria-hidden />

      <Card className="glass-strong relative w-full max-w-md border-border">
        <CardHeader>
          <span className="mb-2 flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Pill className="size-4" />
          </span>
          <CardTitle>
            {profile ? "No pharmacy attached" : "Account not linked yet"}
          </CardTitle>
          <CardDescription>
            You are signed in as <strong>{user.email}</strong>, but this account{" "}
            {profile
              ? "is not a member of any pharmacy workspace."
              : "has no role in the pharmacy system."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {profile ? (
              <>
                The workspace this login belonged to was removed or unassigned.
                Ask the pharmacy owner to add you again from the employee
                register, or contact the platform operator if the pharmacy itself
                was closed.
              </>
            ) : (
              <>
                Ask an administrator to add a row for your user in the{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">profiles</code>{" "}
                table with the role{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">admin</code> or{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">pharmacist</code>
                .
              </>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            <form action={signOut}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
            <Button asChild variant="ghost">
              <Link href="/">Back to the site</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
