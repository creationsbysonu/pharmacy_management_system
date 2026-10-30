"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { FormState } from "@/lib/actions/auth";
import { requireAdminWritable } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const SETUP_MESSAGE =
  "Add SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API) to this deployment's environment variables, then redeploy. Staff sign-in cannot be created without it.";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readable(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("could not find the function") || lower.includes("schema cache")) {
    return "Staff membership is not installed yet — run supabase/migrations/0004_accounts_and_audit.sql in the Supabase SQL editor.";
  }
  if (lower.includes("already been registered") || lower.includes("already exists")) {
    return "That email already has an account. Use its exact address to attach it to this pharmacy.";
  }
  if (lower.includes("password")) {
    return "Supabase rejected the password. Use at least 12 characters.";
  }
  if (lower.includes("only an administrator")) {
    return "Only an administrator can manage staff.";
  }
  if (lower.includes("already runs its own pharmacy")) {
    return "That email already runs its own pharmacy. Use a different address, or ask that owner to remove the account first.";
  }
  return "That staff member could not be saved. Check the details and try again.";
}

/** Finds an existing auth user id by email, so an account can be adopted. */
async function findUserByEmail(
  admin: NonNullable<ReturnType<typeof adminClient>>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function addStaffMember(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireAdminWritable("/settings");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const employeeRaw = String(formData.get("employee_id") ?? "").trim();
  const employeeId = employeeRaw ? Number(employeeRaw) : null;

  if (fullName.length < 2) return { error: "Enter the staff member's name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (employeeId !== null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    return { error: "That employee record is not valid." };
  }

  const admin = adminClient();
  if (!admin) return { error: SETUP_MESSAGE };

  let userId = await findUserByEmail(admin, email);
  let invitedNow = false;

  if (!userId) {
    // An existing account already has a password; only new accounts need one.
    if (password.length < 12) {
      return { error: "Set a password of at least 12 characters for the new account." };
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error || !data.user) {
      return { error: readable(error?.message ?? "The account could not be created.") };
    }
    userId = data.user.id;
    invitedNow = true;
  }

  const supabase = await createClient();
  const { error: adoptError } = await supabase.rpc("adopt_staff", {
    p_user_id: userId,
    p_full_name: fullName,
    p_employee_id: employeeId,
  });

  if (adoptError) {
    // Do not leave an orphaned account behind when it was created just now.
    if (invitedNow) await admin.auth.admin.deleteUser(userId);
    return { error: readable(adoptError.message) };
  }

  revalidatePath("/settings");
  revalidatePath("/employees");
  return {
    message: invitedNow
      ? `${fullName} can now sign in at /login with ${email} and the password you set.`
      : `${fullName} was attached to ${access.pharmacyName} as a pharmacist.`,
  };
}

export async function removeStaffMember(formData: FormData): Promise<void> {
  await requireAdminWritable("/settings");
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_staff", { p_user_id: userId });
  if (error) {
    const { fail } = await import("@/lib/form");
    fail("/settings", readable(error.message));
  }

  revalidatePath("/settings");
}
