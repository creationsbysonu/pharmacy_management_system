"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/actions/auth";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PLANS = ["monthly", "yearly", "lifetime"] as const;
type PaidPlan = (typeof PLANS)[number];

function isPaidPlan(value: string): value is PaidPlan {
  return (PLANS as readonly string[]).includes(value);
}

/**
 * Ask the platform operator to activate a paid plan.
 *
 * This deliberately does not require a writable workspace: a trial that has
 * already lapsed is exactly when someone needs to upgrade, and the RLS policy
 * on upgrade_request allows the insert regardless of trial state. Only the
 * pharmacy administrator may ask; employees are refused by role.
 */
export async function requestUpgrade(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireAccess();

  if (access.profile.role !== "admin") {
    return { error: "Only the pharmacy administrator can change the plan." };
  }

  const plan = String(formData.get("plan") ?? "").trim();
  if (!isPaidPlan(plan)) return { error: "Choose a plan to continue." };

  const contactName = String(formData.get("contact_name") ?? "").trim().slice(0, 120);
  const contactEmail = String(formData.get("contact_email") ?? "").trim().toLowerCase().slice(0, 200);
  const note = String(formData.get("note") ?? "").trim().slice(0, 600);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    return { error: "Enter a billing email address we can reply to." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("upgrade_request").insert({
    workspace_id: access.workspaceId,
    requested_by: access.user.id,
    plan,
    contact_name: contactName || access.profile.full_name,
    contact_email: contactEmail,
    note: note || null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        message:
          "You already have a request waiting. We will email you as soon as it is reviewed.",
      };
    }
    if (error.code === "42P01" || error.message.includes("upgrade_request")) {
      return {
        error:
          "Upgrade requests are not installed yet — run supabase/migrations/0005_billing_and_operator.sql in the Supabase SQL editor.",
      };
    }
    return { error: "That request could not be saved. Try again in a moment." };
  }

  revalidatePath("/upgrade");
  revalidatePath("/dashboard");

  return {
    message:
      "Request received. You will get an email at the address above once the plan is active — usually the same day.",
  };
}

/** Cancel a pending request so a different plan can be chosen. */
export async function cancelUpgradeRequest(formData: FormData): Promise<void> {
  await requireAccess();
  const id = Number(formData.get("request_id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  // Pharmacies have no update policy on upgrade_request; a controlled RPC
  // closes their own pending request and nothing else.
  await supabase.rpc("withdraw_upgrade_request", { p_id: id });

  revalidatePath("/upgrade");
  revalidatePath("/dashboard");
}
