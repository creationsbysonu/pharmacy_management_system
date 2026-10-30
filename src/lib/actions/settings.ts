"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireWritable } from "@/lib/auth";
import type { FormState } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

/** Turns a Postgres/RPC error into something a shopkeeper can act on. */
function rpcMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("could not find the function") || lower.includes("schema cache")) {
    return "Organization settings are not installed yet — run supabase/setup.sql (or migrations 0006_organization_profile.sql) in the Supabase SQL editor.";
  }
  if (lower.startsWith("enter a ") || lower.startsWith("that ")) {
    return message.split(".")[0] + ".";
  }
  if (lower.includes("trial has expired")) {
    return "Your trial has ended. Subscribe to make changes again.";
  }
  if (lower.includes("only an administrator")) {
    return "Only an administrator can do that.";
  }
  if (lower.includes("at least two characters")) {
    return message.split(".")[0] + ".";
  }
  return "That change could not be saved. Try again.";
}

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateProfile(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireWritable("/settings");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 2) return { error: "Enter your full name." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_profile", { p_full_name: fullName });
  if (error) return { error: rpcMessage(error.message) };

  refresh();
  return { message: "Profile updated." };
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The organization's own record: name, contact details and the address its
 * customer e-bills are sent from. One RPC, one write, so a half-saved pharmacy
 * can never exist.
 */
export async function updatePharmacy(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireWritable("/settings");
  if (access.profile.role !== "admin") {
    return { error: "Only an administrator can change the pharmacy profile." };
  }

  const field = (key: string) => String(formData.get(key) ?? "").trim();
  const name = field("pharmacy_name");
  const email = field("pharmacy_email");
  const phone = field("pharmacy_phone");
  const address = field("pharmacy_address");
  const invoiceFromName = field("invoice_from_name");
  const invoiceFromEmail = field("invoice_from_email");

  if (name.length < 2) return { error: "Enter the pharmacy name." };
  if (email && !EMAIL.test(email)) {
    return { error: "That pharmacy email address is not valid." };
  }
  if (invoiceFromEmail && !EMAIL.test(invoiceFromEmail)) {
    return { error: "That sender email address is not valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_workspace_profile", {
    p_name: name,
    p_email: email || null,
    p_phone: phone || null,
    p_address: address || null,
    p_invoice_from_name: invoiceFromName || null,
    p_invoice_from_email: invoiceFromEmail || null,
  });
  if (error) return { error: rpcMessage(error.message) };

  refresh();
  revalidatePath("/", "layout");
  return { message: "Organization saved. New invoices use these details." };
}

export async function changePassword(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireAccess();
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!access.user.email) return { error: "This account has no email address." };
  if (!current) return { error: "Enter your current password." };
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== confirm) return { error: "The two new passwords do not match." };
  if (password === current) return { error: "Choose a password you have not used here." };

  const supabase = await createClient();
  const { error: verify } = await supabase.auth.signInWithPassword({
    email: access.user.email,
    password: current,
  });
  if (verify) return { error: "Your current password is not correct." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("same as")) return { error: "Choose a different password." };
    if (message.includes("weak")) return { error: "That password is too weak. Try a longer one." };
    return { error: "The password could not be changed. Try again." };
  }

  return { message: "Password changed. Other devices stay signed in until you sign them out." };
}

export async function signOutEverywhere(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?signed_out=1");
}
