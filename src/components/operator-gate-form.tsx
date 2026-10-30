"use client";

import { useActionState } from "react";
import { AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockOperator } from "@/lib/actions/operator";

export function OperatorGateForm() {
  const [state, action, pending] = useActionState(unlockOperator, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="passcode">Operator passphrase</Label>
        <Input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="off"
          autoFocus
          placeholder="••••••••••••"
          className="h-11 bg-background/60 font-mono"
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

      <Button type="submit" className="h-11 w-full gap-2" disabled={pending}>
        <KeyRound className="size-4" />
        {pending ? "Verifying…" : "Open the console"}
      </Button>
    </form>
  );
}
