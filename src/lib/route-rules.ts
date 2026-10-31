/**
 * Every redirect decision in the app lives here, as pure functions of a small
 * snapshot of the session.
 *
 * This exists because of a real outage: the proxy, the entrance pages and the
 * app layout each decided separately, from different evidence, when to send a
 * signed-in account onward. An account whose workspace membership had been
 * deleted was "signed in" to one of them and "not a member" to another, and the
 * two bounced the browser between /dashboard and /no-access forever.
 *
 * Rules:
 *   * A redirect may only be taken on the evidence the destination will accept.
 *   * "Can enter" means: signed in, has a profile, and belongs to a workspace.
 *     Anything less keeps the visitor on the page that explains what is missing.
 *
 * `tests/routes.test.mjs` walks this graph for every possible state, so a new
 * rule that could loop fails the suite instead of freezing a browser.
 */

export type Role = "admin" | "pharmacist";

/** What the guards know about the caller. */
export interface Gate {
  signedIn: boolean;
  hasProfile: boolean;
  hasWorkspace: boolean;
  /** The workspace is suspended by the platform operator. */
  suspended: boolean;
  role: Role | null;
  /**
   * The organization has never been described: no real name and no contact
   * details at all. This is what a Google sign-up (or a blank sign-up form)
   * produces, so an administrator in that state must finish /organization
   * before the dashboard will open. Employees are never held by it.
   */
  needsSetup: boolean;
}

export const EMPTY_GATE: Gate = {
  signedIn: false,
  hasProfile: false,
  hasWorkspace: false,
  suspended: false,
  role: null,
  needsSetup: false,
};

/** An administrator who still owes us the organization details. */
export function needsOrganization(gate: Pick<Gate, "role" | "needsSetup">): boolean {
  return gate.needsSetup && gate.role === "admin";
}

/** Reachable without a session. Mirrors the proxy's allow-list. */
export const PUBLIC_PATHS = [
  "/login",
  "/staff/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/checkout",
  "/upgrade",
  "/auth",
  "/superadmin/gate",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Where an account works: owners watch the numbers, employees run the till. */
export function homeForRole(role: Role | null): string {
  return role === "admin" ? "/dashboard" : "/pos";
}

/**
 * The only definition of "this session can go in". Everything that redirects a
 * working session uses this, so no two guards can disagree.
 */
export function entryHome(gate: Gate): string | null {
  if (!gate.signedIn || !gate.hasProfile || !gate.hasWorkspace) return null;
  if (gate.suspended) return "/suspended";
  return needsOrganization(gate) ? "/organization" : homeForRole(gate.role);
}

/** /login and /staff/login: a working session has no business here. */
export const entranceTarget = entryHome;

/**
 * /signup: a suspended workspace is deliberately left on the form — its owner
 * may be here to start over — so there is no target for it.
 */
export function signupTarget(gate: Gate): string | null {
  const home = entryHome(gate);
  return home === "/suspended" ? null : home;
}

/**
 * /no-access: the last stop for a session that is real but belongs nowhere.
 * It only bounces when `entryHome` agrees the session can enter, which is what
 * makes the old /dashboard ⇄ /no-access cycle impossible.
 */
export function noAccessTarget(gate: Gate): string | null {
  if (!gate.signedIn) return "/login";
  return entryHome(gate);
}

/** Any page inside `(app)`: the layout's `requireAccess` rule. */
export function appTarget(gate: Gate): string | null {
  if (!gate.signedIn) return "/login";
  if (!gate.hasProfile || !gate.hasWorkspace) return "/no-access";
  if (gate.suspended) return "/suspended";
  // The last hop before the dashboard, and never a loop: /organization answers
  // this rule with `null` below instead of sending the session back to itself.
  return needsOrganization(gate) ? "/organization" : null;
}

/** The proxy: only unauthenticated visitors are moved, and only off private paths. */
export function proxyTarget(
  pathname: string,
  gate: Pick<Gate, "signedIn">,
): string | null {
  return gate.signedIn || isPublicPath(pathname) ? null : "/login";
}

/**
 * The whole graph in one step: where a request for `pathname` is sent, or null
 * when the page renders. Used by the regression test and by nothing else — the
 * app calls the specific rule it needs.
 */
export function nextFor(pathname: string, gate: Gate): string | null {
  const proxied = proxyTarget(pathname, gate);
  if (proxied) return proxied;

  switch (pathname) {
    case "/login":
    case "/staff/login":
    case "/verify-email":
      return entranceTarget(gate);
    case "/organization":
      if (!gate.hasProfile || !gate.hasWorkspace) return "/no-access";
      if (gate.suspended) return "/suspended";
      // Stay and render the form; everyone else goes home.
      return needsOrganization(gate) ? null : homeForRole(gate.role);
    case "/signup":
      return signupTarget(gate);
    case "/no-access":
      return noAccessTarget(gate);
    case "/dashboard":
    case "/pos":
      return appTarget(gate);
    default:
      return null;
  }
}

/** Routes the test walks. Keep in step with the switch above. */
export const GUARDED_ROUTES = [
  "/",
  "/login",
  "/staff/login",
  "/signup",
  "/verify-email",
  "/organization",
  "/no-access",
  "/suspended",
  "/dashboard",
  "/pos",
] as const;

export type GuardedRoute = (typeof GUARDED_ROUTES)[number];
