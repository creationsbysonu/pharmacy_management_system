"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStaffMember } from "@/lib/actions/staff";

export function EmployeeAccessForm({
  employeeId,
  fullName,
  defaultEmail,
}: {
  employeeId: number;
  fullName: string;
  defaultEmail: string;
}) {
  const [state, action, pending] = useActionState(addStaffMember, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="employee_id" value={employeeId} />
      <input type="hidden" name="full_name" value={fullName} />

      <div className="space-y-2">
        <Label htmlFor="access_email">Work email</Label>
        <Input
          id="access_email"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={defaultEmail}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="access_password">Temporary password</Label>
        <Input
          id="access_password"
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="mt-0.5 size-3.5 shrink-0" />
          At least 12 characters for a new account. Leave it blank if this email
          already has a login — the existing account is attached instead.
        </p>
      </div>

      {state?.error || state?.message ? (
        <p
          role="status"
          className={
            state.error
              ? "flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              : "flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
          }
        >
          {state.error ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{state.error ?? state.message}</span>
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create login"}
      </Button>
    </form>
  );
}
