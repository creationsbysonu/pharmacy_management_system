"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/actions/auth";

export function LoginForm({
  nextPath,
  portal = "admin",
  submitLabel,
}: {
  nextPath: string;
  portal?: "admin" | "staff";
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="portal" value={portal} />

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={portal === "admin" ? "owner@yourpharmacy.com" : "you@yourpharmacy.com"}
          className="h-11 bg-background/60"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          className="h-11 bg-background/60"
          required
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full gap-1.5" disabled={pending}>
        {pending ? "Signing in…" : (submitLabel ?? "Sign in")}
        {!pending ? <ArrowRight className="size-4" /> : null}
      </Button>
    </form>
  );
}
