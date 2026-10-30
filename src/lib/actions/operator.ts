"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  clearOperatorCookie,
  isOperatorEmail,
  operatorConfigured,
  passcodeMatches,
  requireOperator,
  setOperatorCookie,
} from "@/lib/operator";
import {
  DELETE_BLOCKED_REASON,
  OPERATOR_ID_COLUMN,
  canDeleteRow,
  isOperatorTable,
} from "@/lib/operator-tables";
import { ADMIN_KEY_HINT, createAdminClient } from "@/lib/supabase/admin";

export type GateState = { error?: string } | undefined;

const PATHS = [
  "/superadmin",
  "/superadmin/workspaces",
  "/superadmin/analytics",
  "/superadmin/requests",
  "/superadmin/data",
  "/superadmin/audit",
];

function refreshAll() {
  for (const path of PATHS) revalidatePath(path);
  revalidatePath("/dashboard");
}

/** Back to a console page with a sentence the operator can read. */
function back(path: string, key: "ok" | "error", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message.slice(0, 300))}`);
}

function audit(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  actor: string,
  action: string,
  target: string | null,
  detail: Record<string, unknown> = {},
) {
  return admin.from("operator_audit").insert({
    actor_email: actor,
    action,
    target,
    detail,
  });
}

/* -------------------------------------------------------------------------- */
/* Gate                                                                        */
/* -------------------------------------------------------------------------- */

export async function unlockOperator(
  _previous: GateState,
  formData: FormData,
): Promise<GateState> {
  if (!operatorConfigured()) {
    return { error: `The operator gate is not configured. ${"Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSCODE, then restart."}` };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sign in with the operator account first, then enter the passphrase." };
  }
  if (!isOperatorEmail(user.email)) {
    return { error: "This account is not the platform operator." };
  }

  const passcode = String(formData.get("passcode") ?? "");
  if (!passcodeMatches(passcode)) {
    return { error: "That passphrase is not correct." };
  }

  await setOperatorCookie(user.id);
  redirect("/superadmin");
}

export async function lockOperator(): Promise<void> {
  await clearOperatorCookie();
  redirect("/superadmin/gate");
}

/* -------------------------------------------------------------------------- */
/* Upgrade requests                                                            */
/* -------------------------------------------------------------------------- */

export async function decideUpgradeRequest(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const id = Number(formData.get("request_id"));
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("decision_note") ?? "").trim().slice(0, 400);

  if (!admin || !Number.isInteger(id) || !["approve", "reject"].includes(decision)) return;

  const { data: request } = await admin
    .from("upgrade_request")
    .select("id, workspace_id, plan, status")
    .eq("id", id)
    .maybeSingle<{ id: number; workspace_id: string; plan: string; status: string }>();

  if (!request || request.status !== "pending") return;

  await admin
    .from("upgrade_request")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      decision_note: note || null,
      decided_by: operator.email,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (decision === "approve") {
    await admin
      .from("workspaces")
      .update({ plan: request.plan, status: "active", trial_ends_at: null })
      .eq("id", request.workspace_id);
  }

  await audit(admin, operator.email, `upgrade.${decision}`, request.workspace_id, {
    request_id: id,
    plan: request.plan,
    note,
  });

  refreshAll();
}

/* -------------------------------------------------------------------------- */
/* Workspaces                                                                  */
/* -------------------------------------------------------------------------- */

export async function setWorkspacePlan(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();
  if (!admin) return;

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!workspaceId || !["trial", "monthly", "yearly", "lifetime"].includes(plan)) return;

  const patch: Record<string, unknown> = { plan };
  if (status === "active" || status === "suspended") patch.status = status;
  if (plan !== "trial") patch.trial_ends_at = null;

  await admin.from("workspaces").update(patch).eq("id", workspaceId);
  await audit(admin, operator.email, "workspace.plan", workspaceId, { plan, status });
  refreshAll();
}

export async function extendTrial(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();
  if (!admin) return;

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const days = Number(formData.get("days") ?? 0);
  if (!workspaceId || !Number.isFinite(days) || days === 0) return;
  const safeDays = Math.max(-365, Math.min(365, Math.trunc(days)));

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, plan, trial_ends_at")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; plan: string; trial_ends_at: string | null }>();

  if (!workspace) return;

  const base = workspace.trial_ends_at ? Date.parse(workspace.trial_ends_at) : Date.now();
  const from = Math.max(base, Date.now());
  const next = new Date(from + safeDays * 86_400_000).toISOString();

  await admin
    .from("workspaces")
    .update({ trial_ends_at: next, plan: workspace.plan === "trial" ? "trial" : workspace.plan, status: "active" })
    .eq("id", workspaceId);

  await audit(admin, operator.email, "workspace.trial", workspaceId, { days: safeDays, until: next });
  refreshAll();
}

export async function toggleWorkspaceStatus(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();
  if (!admin) return;

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!workspaceId || !["active", "suspended"].includes(status)) return;

  await admin.from("workspaces").update({ status }).eq("id", workspaceId);
  await audit(admin, operator.email, `workspace.${status}`, workspaceId, {});
  refreshAll();
}

/* -------------------------------------------------------------------------- */
/* Organization registry                                                       */
/* -------------------------------------------------------------------------- */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Every option a pharmacy has, edited from one place.
 *
 * The operator can change the organization record itself — contact details and
 * the address its customer e-bills are sent from — together with the plan, the
 * status and the trial clock. Nothing else is shared between tenants, so a
 * change here touches one workspace only.
 */
export async function saveWorkspaceRegistry(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const path = `/superadmin/workspaces/${workspaceId}`;

  if (!admin) back(path, "error", ADMIN_KEY_HINT);

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const name = text("name");
  const email = text("email");
  const phone = text("phone");
  const address = text("address");
  const invoiceFromName = text("invoice_from_name");
  const invoiceFromEmail = text("invoice_from_email");
  const plan = text("plan");
  const status = text("status");
  const trialRaw = text("trial_ends_at");

  if (name.length < 2) back(path, "error", "Enter a pharmacy name of at least two characters.");
  if (email && !EMAIL.test(email)) back(path, "error", "That pharmacy email is not valid.");
  if (invoiceFromEmail && !EMAIL.test(invoiceFromEmail)) {
    back(path, "error", "That sender email is not valid.");
  }
  if (!["trial", "monthly", "yearly", "lifetime"].includes(plan)) {
    back(path, "error", "Choose a valid plan.");
  }
  if (!["active", "suspended"].includes(status)) {
    back(path, "error", "Choose a valid status.");
  }

  const trialEnds = trialRaw ? new Date(`${trialRaw}T23:59:59Z`) : null;
  if (trialRaw && Number.isNaN(trialEnds?.getTime())) {
    back(path, "error", "That trial end date is not valid.");
  }

  const { error } = await admin
    .from("workspaces")
    .update({
      name: name.slice(0, 80),
      email: email || null,
      phone: phone || null,
      address: address.slice(0, 240) || null,
      invoice_from_name: invoiceFromName.slice(0, 80) || null,
      invoice_from_email: invoiceFromEmail || null,
      plan,
      status,
      trial_ends_at: plan === "trial" && trialEnds ? trialEnds.toISOString() : null,
    })
    .eq("id", workspaceId);

  if (error) {
    const missingColumn =
      error.code === "42703" ||
      /column .* does not exist/i.test(error.message) ||
      /could not find the '.*' column/i.test(error.message);
    back(
      path,
      "error",
      missingColumn
        ? "This database is missing the organization columns. Run supabase/migrations/0006_organization_profile.sql, then try again."
        : error.message,
    );
  }

  await audit(admin, operator.email, "workspace.registry", workspaceId, {
    name,
    plan,
    status,
    email: email || null,
    invoice_from_email: invoiceFromEmail || null,
  });

  refreshAll();
  revalidatePath(path);
  back(path, "ok", "Organization record saved. New invoices and e-bills use these details.");
}

/* -------------------------------------------------------------------------- */
/* Accounts and membership                                                     */
/* -------------------------------------------------------------------------- */

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

async function membershipCount(admin: Admin, userId: string): Promise<number> {
  const { count } = await admin
    .from("workspace_members")
    .select("workspace_id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

/**
 * A login with no pharmacy is not allowed to linger as a half-account: it keeps
 * its auth user (so the person can be re-attached) but loses the profile row
 * that gave it a role. Signed in with no profile the app explains itself and
 * offers a sign-out; it never redirects.
 */
async function revokeProfileIfHomeless(admin: Admin, userId: string): Promise<boolean> {
  if ((await membershipCount(admin, userId)) > 0) return false;
  await admin.from("profiles").delete().eq("id", userId);
  return true;
}

interface FoundUser {
  id: string;
  fullName: string | null;
}

/** Finds an auth account by email without loading the whole user table. */
async function findUserByEmail(admin: Admin, email: string): Promise<FoundUser | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      const meta = match.user_metadata as { full_name?: string } | undefined;
      return { id: match.id, fullName: meta?.full_name?.trim() || null };
    }
    if (data.users.length < 200) break;
  }
  return null;
}

/** Removes one member from one pharmacy, or closes their login if it was their last. */
export async function detachMember(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const path = `/superadmin/workspaces/${workspaceId}`;

  if (!admin) back(path, "error", ADMIN_KEY_HINT);
  if (!workspaceId || !userId) back(path, "error", "That member could not be identified.");

  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) back(path, "error", error.message);

  const revoked = await revokeProfileIfHomeless(admin, userId);

  await audit(admin, operator.email, "member.detach", workspaceId, {
    user_id: userId,
    profile_revoked: revoked,
  });

  refreshAll();
  revalidatePath(path);
  back(
    path,
    "ok",
    revoked
      ? "Member removed. They belonged to no other pharmacy, so their login is now unattached and can be re-attached here later."
      : "Member removed from this pharmacy. Their login still works in the other pharmacy they belong to.",
  );
}

/**
 * Attaches an account to a pharmacy — the repair path after a membership or a
 * profile went missing, and the way to hand an existing login over to another
 * workspace.
 *
 * If no account exists for the address, one is created here with the temporary
 * password the operator sets, and the empty trial workspace the signup trigger
 * gives every new account is removed so the person belongs only to this
 * pharmacy (the same cleanup `adopt_staff` does in the app).
 */
export async function attachAccount(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "pharmacist");
  const password = String(formData.get("password") ?? "");
  const path = `/superadmin/workspaces/${workspaceId}`;

  if (!admin) back(path, "error", ADMIN_KEY_HINT);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    back(path, "error", "Enter a valid email address.");
  }
  if (role !== "admin" && role !== "pharmacist") {
    back(path, "error", "Choose either administrator or pharmacist.");
  }

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; name: string }>();
  if (!workspace) back("/superadmin/workspaces", "error", "That pharmacy no longer exists.");

  let user = await findUserByEmail(admin, email);
  let created = false;

  if (!user) {
    if (password.length < 12) {
      back(
        path,
        "error",
        "No account uses that email. To create one here, set a temporary password of at least 12 characters.",
      );
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: email.split("@")[0] },
    });
    if (error || !data.user) {
      back(path, "error", error?.message ?? "The account could not be created.");
    }
    user = { id: data.user.id, fullName: null };
    created = true;
  }

  // Profile first: without one the membership would point at nobody.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle<{ id: string }>();

  if (existingProfile) {
    await admin.from("profiles").update({ role }).eq("id", user.id);
  } else {
    await admin
      .from("profiles")
      .insert({ id: user.id, role, full_name: user.fullName });
  }

  const { error: memberError } = await admin
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: user.id });

  const alreadyMember = Boolean(memberError);

  if (created) {
    // The auth trigger hands every new account its own empty trial workspace.
    // Letting it stay would make that empty pharmacy the one the app opens first.
    const { data: orphans } = await admin
      .from("workspaces")
      .select("id")
      .eq("created_by", user.id);

    for (const orphan of orphans ?? []) {
      if (orphan.id === workspaceId) continue;
      const { count } = await admin
        .from("meds")
        .select("med_id", { count: "exact", head: true })
        .eq("workspace_id", orphan.id);
      if ((count ?? 0) > 0) continue;
      await admin.from("workspaces").delete().eq("id", orphan.id);
    }
  }

  await audit(admin, operator.email, "member.attach", workspaceId, {
    user_id: user.id,
    email,
    role,
    account_created: created,
    already_member: alreadyMember,
  });

  refreshAll();
  revalidatePath(path);
  back(
    path,
    "ok",
    created
      ? `${email} now has an account and belongs to ${workspace.name}. They sign in with the temporary password you set.`
      : alreadyMember
        ? `${email} already belonged to ${workspace.name}; their role is now ${role}.`
        : `${email} was re-attached to ${workspace.name} as ${role}.`,
  );
}

/**
 * Closes a pharmacy.
 *
 * Its rows go (memberships cascade), and every member who is left without any
 * other pharmacy loses their profile in the same step, so no login is stranded
 * mid-way through the app. The confirmation has to match the pharmacy name: a
 * one-click delete of a tenant is too easy to get wrong.
 */
export async function closeWorkspace(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const path = `/superadmin/workspaces/${workspaceId}`;

  if (!admin) back(path, "error", ADMIN_KEY_HINT);

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; name: string }>();
  if (!workspace) back("/superadmin/workspaces", "error", "That pharmacy no longer exists.");

  if (confirmation.toLowerCase() !== workspace.name.trim().toLowerCase()) {
    back(path, "error", "Type the pharmacy name exactly to confirm closing it.");
  }

  const { data: members } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);
  const memberIds = (members ?? []).map((row) => String(row.user_id));

  const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);
  if (error) back(path, "error", error.message);

  let revoked = 0;
  for (const userId of memberIds) {
    if (await revokeProfileIfHomeless(admin, userId)) revoked += 1;
  }

  await audit(admin, operator.email, "workspace.close", workspaceId, {
    name: workspace.name,
    members: memberIds.length,
    profiles_revoked: revoked,
  });

  refreshAll();
  back(
    "/superadmin/workspaces",
    "ok",
    `${workspace.name} was closed. ${revoked} login${revoked === 1 ? "" : "s"} lost their last pharmacy and were detached cleanly.`,
  );
}

/* -------------------------------------------------------------------------- */
/* Data browser                                                                */
/* -------------------------------------------------------------------------- */

export async function deleteOperatorRow(formData: FormData): Promise<void> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const table = String(formData.get("table") ?? "");
  const workspaceFilter = String(formData.get("workspace") ?? "");
  const path = `/superadmin/data?table=${encodeURIComponent(table)}${
    workspaceFilter ? `&workspace=${encodeURIComponent(workspaceFilter)}` : ""
  }`;

  if (!admin) back(path, "error", ADMIN_KEY_HINT);
  if (!isOperatorTable(table)) back("/superadmin/data", "error", "Unknown table.");

  // The form is not the security boundary: tables with composite keys, tenant
  // accounts or an append-only log are refused here as well as hidden in the UI.
  if (!canDeleteRow(table)) {
    back(
      path,
      "error",
      DELETE_BLOCKED_REASON[table] ?? "That table cannot be deleted from here.",
    );
  }

  const idColumn = String(formData.get("id_column") ?? "");
  const idValue = String(formData.get("id_value") ?? "");

  if (idColumn !== OPERATOR_ID_COLUMN[table] || !idValue) {
    back(path, "error", "That row could not be identified.");
  }

  const { error } = await admin.from(table).delete().eq(idColumn, idValue);
  if (error) back(path, "error", error.message);

  await audit(admin, operator.email, "row.delete", `${table}:${idValue}`, {
    table,
    id_column: idColumn,
  });

  refreshAll();
  back(path, "ok", `One ${table} row was deleted.`);
}
