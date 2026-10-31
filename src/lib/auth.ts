import { cache } from "react";
import { redirect } from "next/navigation";
import { fail } from "@/lib/form";
import {
  EMPTY_GATE,
  appTarget,
  homeForRole,
  type Gate,
} from "@/lib/route-rules";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SessionUser } from "@/lib/types";

export type Plan = "trial" | "monthly" | "yearly" | "lifetime";

export { TRIAL_DAYS } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/constants";

export interface Access {
  user: SessionUser;
  profile: Profile;
  /** Everything this account owns and can see. */
  workspaceId: string;
  pharmacyName: string;
  plan: Plan;
  trialEndsAt: string | null;
  /** Whole days left in the trial; null when the plan is not a trial. */
  daysLeft: number | null;
  /** True once a trial has ended: read, search and export still work. */
  readOnly: boolean;
  /** Set by the platform operator. A suspended workspace cannot be entered. */
  suspended: boolean;
  /**
   * The organization was never described — a Google sign-up or a blank sign-up
   * form both leave it this way. An administrator must finish /organization
   * first; see lib/route-rules.ts.
   */
  needsSetup: boolean;
}

/**
 * The signed-in account, verified from the JWT claims. `getClaims()` checks the
 * signature locally when the project signs tokens asymmetrically, which removes
 * a network round trip from every navigation compared with `getUser()`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub,
    email: data.claims.email ?? null,
  };
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return data ?? null;
});

interface WorkspaceRef {
  id: string;
  name: string;
  plan: Plan;
  status: string;
  trial_ends_at: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

/**
 * True when the workspace still carries the name the provisioning trigger
 * leaves behind and not a single contact detail the owner actually typed.
 *
 * The provisioning trigger copies the signup address into `workspaces.email`,
 * so a Google account arrives with "an email on file" without anyone having
 * described anything — counting that would make the /organization hold dead
 * code. An address identical to the sign-in therefore does not count; a
 * different address, a phone number or an address does.
 *
 * Deliberately escapable: a pharmacy genuinely called "My pharmacy" passes the
 * moment it records a phone number, address or its own contact email, so
 * nobody can ever be trapped by this check.
 */
function lacksOrganization(
  workspace: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  },
  ownerEmail: string | null,
): boolean {
  const name = (workspace.name ?? "").trim();
  const placeholder = name === "" || /^my\s*pharmacy$/i.test(name);
  if (!placeholder) return false;
  if (workspace.phone?.trim() || workspace.address?.trim()) return false;

  const email = (workspace.email ?? "").trim();
  if (!email) return true;
  // The copied login address is not contact details anybody entered.
  return email.toLowerCase() === (ownerEmail ?? "").toLowerCase();
}

/** The signed-in account's workspace, role, plan and trial state. */
export const getAccess = cache(async (): Promise<Access | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  // The profile and the membership do not depend on each other, so fetch them
  // together instead of paying for two sequential round trips.
  const [profile, { data: memberships, error: membershipError }] = await Promise.all([
    getProfile(),
    supabase
      .from("workspace_members")
      .select(
        "workspace_id, created_at, workspaces ( id, name, plan, status, trial_ends_at, email, phone, address )",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  // The contact columns arrive with migration 0006. On a database that has not
  // run it yet, fall back to the name alone instead of failing every page.
  const membershipResult = membershipError
    ? await supabase
        .from("workspace_members")
        .select("workspace_id, created_at, workspaces ( id, name, plan, status, trial_ends_at )")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
    : { data: memberships, error: null };

  if (!profile) return null;

  const row = membershipResult.data?.[0] as
    | { workspace_id: string; workspaces: WorkspaceRef | WorkspaceRef[] | null }
    | undefined;

  const embedded = row?.workspaces ?? null;
  const workspace = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!row || !workspace) return null;
  const ends = workspace.trial_ends_at ? Date.parse(workspace.trial_ends_at) : null;
  const daysLeft = ends === null ? null : Math.max(0, Math.ceil((ends - Date.now()) / 86_400_000));

  return {
    user,
    profile,
    workspaceId: row.workspace_id,
    pharmacyName: workspace.name,
    plan: workspace.plan,
    trialEndsAt: workspace.trial_ends_at,
    daysLeft,
    readOnly: workspace.plan === "trial" && ends !== null && ends < Date.now(),
    suspended: workspace.status !== "active",
    needsSetup: lacksOrganization(workspace, user.email),
  };
});

/**
 * The session as the redirect rules see it. One snapshot feeds every guard, so
 * the proxy, the entrance pages and the app layout cannot disagree about who
 * may go where (see lib/route-rules.ts for why that matters).
 */
export const getGate = cache(async (): Promise<Gate> => {
  const user = await getCurrentUser();
  if (!user) return EMPTY_GATE;

  const [profile, access] = await Promise.all([getProfile(), getAccess()]);

  return {
    signedIn: true,
    hasProfile: Boolean(profile),
    hasWorkspace: Boolean(access),
    suspended: access?.suspended ?? false,
    role: profile?.role ?? null,
    needsSetup: access?.needsSetup ?? false,
  };
});

/** Where an account should land: owners see numbers, employees see the till. */
export function homeFor(access: Pick<Access, "profile">): string {
  return homeForRole(access.profile.role);
}

/** Requires a signed-in account that also has a profile row. */
export async function requireProfile(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (!profile) redirect("/no-access");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard?denied=1");
  return profile;
}

/** Requires a signed-in account that belongs to a workspace. */
export async function requireAccess(): Promise<Access> {
  const access = await getAccess();

  // Ask the shared rule where this session belongs. It only sends an account
  // onward when it can actually enter, so a half-removed account lands on the
  // page that explains it instead of ping-ponging between two guards.
  const target = appTarget(await getGate());
  if (target) redirect(target);
  if (!access) redirect("/no-access");

  return access;
}

/**
 * Guards every create, update and delete. On an ended trial it redirects back
 * to `failPath` with a readable message instead of letting Postgres reject the
 * write with a row level security error.
 */
export async function requireWritable(failPath: string): Promise<Access> {
  const access = await requireAccess();
  if (access.readOnly) {
    fail(
      failPath,
      `Your ${TRIAL_DAYS}-day free trial has ended. Subscribe to start recording changes again — nothing has been deleted and everything stays readable.`
    );
  }
  return access;
}

/** Administrator-only, and not during an ended trial. */
export async function requireAdminWritable(failPath: string): Promise<Access> {
  const access = await requireWritable(failPath);
  if (access.profile.role !== "admin") redirect("/dashboard?denied=1");
  return access;
}