import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The organization behind the session.
 *
 * Every workspace is one pharmacy: its own name, address, phone number and
 * invoice sender. Nothing on this record is shared with another tenant, and RLS
 * only lets a member of that workspace read it.
 *
 * The contact columns arrive with migration 0006. Until that file is applied the
 * first query fails, so the loader falls back to the name alone and the app
 * keeps working — the settings screen explains what is missing.
 */
export interface PharmacyProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  invoiceFromName: string | null;
  invoiceFromEmail: string | null;
  /** False when the database has not had migration 0006 applied yet. */
  hasContactFields: boolean;
}

interface WorkspaceRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  invoice_from_name?: string | null;
  invoice_from_email?: string | null;
}

export const loadPharmacyProfile = cache(
  async (workspaceId: string): Promise<PharmacyProfile | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workspaces")
      .select(
        "id, name, email, phone, address, invoice_from_name, invoice_from_email",
      )
      .eq("id", workspaceId)
      .maybeSingle<WorkspaceRow>();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        invoiceFromName: data.invoice_from_name ?? null,
        invoiceFromEmail: data.invoice_from_email ?? null,
        hasContactFields: true,
      };
    }

    const { data: basic } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .maybeSingle<WorkspaceRow>();

    if (!basic) return null;

    return {
      id: basic.id,
      name: basic.name,
      email: null,
      phone: null,
      address: null,
      invoiceFromName: null,
      invoiceFromEmail: null,
      hasContactFields: false,
    };
  },
);

/** The pharmacy an invoice is printed for, with sane fallbacks. */
export function invoiceBrand(pharmacy: PharmacyProfile | null, fallbackName: string) {
  return {
    name: pharmacy?.name ?? fallbackName,
    email: pharmacy?.email ?? null,
    phone: pharmacy?.phone ?? null,
    address: pharmacy?.address ?? null,
  };
}

export type SenderSource = "pharmacy" | "platform" | "sandbox";

export interface SenderIdentity {
  /** The full `Name <address>` string handed to the mail provider. */
  from: string;
  /** The bare address the message is sent from. */
  email: string;
  /** Replies go to the pharmacy's own address when it has one. */
  replyTo: string | null;
  source: SenderSource;
}

function platformSenderEmail(): string {
  return (process.env.INVOICE_FROM_EMAIL ?? "").trim();
}

/** True when the deployment can send mail at all. */
export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Keeps a display name from breaking the `Name <address>` header. */
function safeName(value: string): string {
  return value.replace(/[<>"\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * Who a customer invoice is sent from.
 *
 * Priority: the pharmacy's own verified sender, then the deployment's shared
 * sender, then Resend's sandbox address (which only delivers to the account
 * owner, so it exists to make the failure obvious rather than silent).
 */
export function invoiceSender(
  pharmacy: Pick<PharmacyProfile, "name" | "email" | "invoiceFromName" | "invoiceFromEmail"> | null,
  fallbackName: string,
): SenderIdentity {
  const pharmacyEmail = pharmacy?.invoiceFromEmail?.trim() || "";
  const platformEmail = platformSenderEmail();

  const email = pharmacyEmail || platformEmail || "onboarding@resend.dev";
  const source: SenderSource = pharmacyEmail
    ? "pharmacy"
    : platformEmail
      ? "platform"
      : "sandbox";

  const name = safeName(pharmacy?.invoiceFromName?.trim() || pharmacy?.name || fallbackName);

  return {
    from: `${name} <${email}>`,
    email,
    replyTo: pharmacy?.email?.trim() || null,
    source,
  };
}
