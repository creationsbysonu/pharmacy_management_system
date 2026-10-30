"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emailInvoice } from "@/lib/actions/billing";

export function InvoiceEmailButton({
  saleId,
  email,
  disabled,
}: {
  saleId: number;
  email: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(emailInvoice, undefined);

  return (
    <div className="space-y-2">
      <form action={action}>
        <input type="hidden" name="sale_id" value={saleId} />
        <Button type="submit" variant="outline" size="sm" className="gap-1.5" disabled={pending || disabled}>
          <Mail className="size-3.5" />
          {pending ? "Sending…" : "Email invoice"}
        </Button>
      </form>

      {state?.error || state?.message ? (
        <p
          role="status"
          className={
            state.error
              ? "flex items-start gap-1.5 text-xs text-destructive"
              : "flex items-start gap-1.5 text-xs text-primary"
          }
        >
          {state.error ? (
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span>{state.error ?? state.message}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Sends the PDF to {email}.</p>
      )}
    </div>
  );
}
