"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/actions/auth";
import type { PharmacyProfile } from "@/lib/pharmacy";
import { addStaffMember } from "@/lib/actions/staff";
import {
  changePassword,
  signOutEverywhere,
  updatePharmacy,
  updateProfile,
} from "@/lib/actions/settings";

function Feedback({ state }: { state: FormState }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p
      className={
        state.error
          ? "flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
      }
      role="status"
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

export function ProfileForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="full_name">Your name</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Contact support to change the address on the account.
        </p>
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

/**
 * The organization's own record. The administrator of this pharmacy is the only
 * person who can change it, and it only ever describes this workspace.
 */
export function PharmacyProfileForm({ profile }: { profile: PharmacyProfile }) {
  const [state, action, pending] = useActionState(updatePharmacy, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pharmacy_name">Pharmacy name</Label>
        <Input
          id="pharmacy_name"
          name="pharmacy_name"
          defaultValue={profile.name}
          required
        />
        <p className="text-xs text-muted-foreground">
          Shown in the app heading, on invoices and on every export.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pharmacy_phone">Phone</Label>
          <Input
            id="pharmacy_phone"
            name="pharmacy_phone"
            defaultValue={profile.phone ?? ""}
            placeholder="+977 98…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pharmacy_email">Pharmacy email</Label>
          <Input
            id="pharmacy_email"
            name="pharmacy_email"
            type="email"
            defaultValue={profile.email ?? ""}
            placeholder="care@yourpharmacy.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pharmacy_address">Address</Label>
        <textarea
          id="pharmacy_address"
          name="pharmacy_address"
          defaultValue={profile.address ?? ""}
          rows={2}
          maxLength={240}
          placeholder="Street, town, province"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          Printed under the pharmacy name on every invoice.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-background/40 p-3.5">
        <div>
          <p className="text-sm font-medium">Customer e-bills</p>
          <p className="text-xs text-muted-foreground">
            The identity a customer sees when you email them an invoice. Replies go
            to the pharmacy email above.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoice_from_name">Sender name</Label>
            <Input
              id="invoice_from_name"
              name="invoice_from_name"
              defaultValue={profile.invoiceFromName ?? ""}
              placeholder={profile.name}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_from_email">Sender address</Label>
            <Input
              id="invoice_from_email"
              name="invoice_from_email"
              type="email"
              defaultValue={profile.invoiceFromEmail ?? ""}
              placeholder="invoices@yourpharmacy.com"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The address must sit on a domain verified in the mail provider, otherwise
          sending fails. Leave it blank to use the deployment&apos;s shared sender.
        </p>
      </div>

      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save organization"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="current_password">Current password</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Repeat it</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <KeyRound className="size-3.5" /> At least 12 characters. A short sentence works well.
      </p>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

export function SignOutEverywhereForm() {
  return (
    <form action={signOutEverywhere}>
      <Button type="submit" variant="outline">
        Sign out of all devices
      </Button>
    </form>
  );
}

export function StaffForm() {
  const [state, action, pending] = useActionState(addStaffMember, undefined);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="staff_name">Name</Label>
          <Input id="staff_name" name="full_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff_email">Email</Label>
          <Input id="staff_email" name="email" type="email" autoComplete="off" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff_password">Temporary password</Label>
        <Input
          id="staff_password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <p className="text-xs text-muted-foreground">
          Share it with them over a secure channel; they can change it from their own settings.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff_employee_id">Employee ID (optional)</Label>
        <Input
          id="staff_employee_id"
          name="employee_id"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="e.g. 12"
        />
        <p className="text-xs text-muted-foreground">
          Links this login to their record in the employee register, so the roster
          shows who can sign in. Add the record first under Employees if it does
          not exist yet.
        </p>
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        <UserPlus />
        {pending ? "Adding…" : "Add pharmacist"}
      </Button>
    </form>
  );
}
