import Link from "next/link";
import { Pill, TriangleAlert } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth-forms";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Pill className="size-4" />
          </span>
          <span className="text-sm font-semibold">Pharmacia</span>
        </div>

        <h1 className="font-heading text-xl font-semibold">Choose a new password</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Pick something at least 8 characters long.
        </p>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <>
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                This reset link has expired or was already used. Request a fresh
                one and open it straight away.
              </span>
            </p>
            <Button asChild className="w-full">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}