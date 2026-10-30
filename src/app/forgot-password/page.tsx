import Link from "next/link";
import { Pill } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Pill className="size-4" />
          </span>
          <span className="text-sm font-semibold">Pharmacia</span>
        </div>

        <h1 className="font-heading text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Enter the email on your account and we will send a link to set a new
          password.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}