"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestUpgrade } from "@/lib/actions/upgrade";

const LABELS: Record<string, string> = {
  monthly: "Monthly · ₹999 / month",
  yearly: "Yearly · ₹9,999 / year",
  lifetime: "Lifetime · ₹24,999 once",
};

export function UpgradeForm({
  defaultPlan,
  defaultName,
  defaultEmail,
  disabled,
}: {
  defaultPlan: string;
  defaultName: string;
  defaultEmail: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(requestUpgrade, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan">Plan</Label>
          <Select name="plan" defaultValue={defaultPlan} disabled={disabled}>
            <SelectTrigger id="plan" className="w-full">
              <SelectValue placeholder="Choose a plan" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_name">Billing name</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={defaultName}
            placeholder="Pharmacy owner name"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_email">Billing email</Label>
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={defaultEmail}
          placeholder="accounts@yourpharmacy.com"
          disabled={disabled}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Anything we should know? (optional)</Label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={600}
          placeholder="GST number, preferred start date, two branches…"
          disabled={disabled}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50"
        />
      </div>

      {state?.error || state?.message ? (
        <p
          role="status"
          className={
            state.error
              ? "flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              : "flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-sm text-primary"
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

      <Button type="submit" disabled={pending || disabled} className="gap-1.5">
        <Send className="size-4" />
        {pending ? "Sending request…" : "Send upgrade request"}
      </Button>
    </form>
  );
}
