"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPassword,
  resetPassword,
  signUp,
  type FormState,
} from "@/lib/actions/auth";

function Feedback({ state }: { state: FormState }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p
      className={
        state.error
          ? "flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
      }
    >
      {state.error ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.error ?? state.message}</span>
    </p>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  if (state?.message) {
    return (
      <div className="space-y-4">
        <Feedback state={state} />
        <Button asChild variant="outline" className="w-full">
          <a href="/login">Back to sign in</a>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Your name</Label>
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pharmacy_name">Pharmacy name</Label>
        <Input
          id="pharmacy_name"
          name="pharmacy_name"
          placeholder="e.g. Kinmel Chemists"
          autoComplete="organization"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@pharmacy.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          minLength={12}
          required
        />
      </div>

      <Feedback state={state} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating your workspace…" : "Start free trial"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPassword, undefined);

  if (state?.message) {
    return <Feedback state={state} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@pharmacy.com"
          required
        />
      </div>

      <Feedback state={state} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          minLength={12}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Repeat new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <Feedback state={state} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}