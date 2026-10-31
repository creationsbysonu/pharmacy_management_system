/**
 * Walks the authentication redirect graph for every possible session state.
 *
 * The regression this guards is specific: a signed-in account whose workspace
 * membership was deleted used to be sent /dashboard → /no-access → /dashboard
 * forever, and the browser froze on the way to the login page. Any new rule
 * that makes two guards disagree will show up here as a cycle.
 *
 * Run with `npm test` (node --test, no bundler needed).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { GUARDED_ROUTES, nextFor } from "../src/lib/route-rules.ts";

const MAX_HOPS = 6;

/** Only states the database can actually produce. */
function states() {
  const list = [
    {
      label: "anonymous",
      signedIn: false,
      hasProfile: false,
      hasWorkspace: false,
      suspended: false,
      role: null,
      needsSetup: false,
    },
  ];
  for (const hasProfile of [false, true]) {
    for (const hasWorkspace of [false, true]) {
      // A workspace always comes with a profile: getAccess returns null without one.
      if (hasWorkspace && !hasProfile) continue;
      for (const suspended of hasWorkspace ? [false, true] : [false]) {
        for (const role of hasProfile ? ["admin", "pharmacist"] : [null]) {
          // A workspace that has never been described, or a complete one.
          for (const needsSetup of hasWorkspace ? [false, true] : [false]) {
            list.push({
              label: `profile=${hasProfile} workspace=${hasWorkspace} suspended=${suspended} role=${role} needsSetup=${needsSetup}`,
              signedIn: true,
              hasProfile,
              hasWorkspace,
              suspended,
              role,
              needsSetup,
            });
          }
        }
      }
    }
  }
  return list;
}

/** Follow the redirects a browser would, and record where it ends up. */
function walk(start, gate) {
  const visited = [start];
  let path = start;

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const next = nextFor(path, gate);
    if (next === null) return { path, visited, settled: true };
    assert.ok(
      !visited.includes(next),
      `redirect cycle for ${gate.label}: ${[...visited, next].join(" → ")}`,
    );
    visited.push(next);
    path = next;
  }

  return { path, visited, settled: false };
}

test("no session state can bounce between guards", () => {
  for (const gate of states()) {
    for (const route of GUARDED_ROUTES) {
      const result = walk(route, gate);
      assert.ok(
        result.settled,
        `${gate.label} starting at ${route} never settles: ${result.visited.join(" → ")}`,
      );
    }
  }
});

test("a session with a profile but no workspace lands on /no-access, once", () => {
  const broken = {
    label: "orphaned membership",
    signedIn: true,
    hasProfile: true,
    hasWorkspace: false,
    suspended: false,
    role: "admin",
  };

  assert.equal(nextFor("/dashboard", broken), "/no-access");
  assert.equal(nextFor("/pos", broken), "/no-access");
  // The page that receives it must render rather than pass it on.
  assert.equal(nextFor("/no-access", broken), null);

  // And the front doors must show their form instead of forwarding the session
  // into the app, which is what made the navbar links appear to hang.
  assert.equal(nextFor("/login", broken), null);
  assert.equal(nextFor("/staff/login", broken), null);
  assert.equal(nextFor("/signup", broken), null);
});

test("a session with no profile is explained, not looped", () => {
  const unlinked = {
    label: "no profile",
    signedIn: true,
    hasProfile: false,
    hasWorkspace: false,
    suspended: false,
    role: null,
  };

  assert.equal(nextFor("/dashboard", unlinked), "/no-access");
  assert.equal(nextFor("/no-access", unlinked), null);
  assert.equal(nextFor("/login", unlinked), null);
});

test("working sessions are sent to the right home", () => {
  const admin = {
    label: "admin",
    signedIn: true,
    hasProfile: true,
    hasWorkspace: true,
    suspended: false,
    role: "admin",
  };
  const pharmacist = { ...admin, label: "pharmacist", role: "pharmacist" };

  for (const route of ["/login", "/staff/login", "/signup", "/no-access"]) {
    assert.equal(nextFor(route, admin), "/dashboard");
    assert.equal(nextFor(route, pharmacist), "/pos");
  }
  assert.equal(nextFor("/dashboard", admin), null);
  assert.equal(nextFor("/pos", pharmacist), null);
});

test("a suspended workspace is parked on /suspended and cannot be signed past", () => {
  const suspended = {
    label: "suspended",
    signedIn: true,
    hasProfile: true,
    hasWorkspace: true,
    suspended: true,
    role: "admin",
  };

  assert.equal(nextFor("/dashboard", suspended), "/suspended");
  assert.equal(nextFor("/login", suspended), "/suspended");
  assert.equal(nextFor("/staff/login", suspended), "/suspended");
  assert.equal(nextFor("/suspended", suspended), null);
  // Signup stays put: the owner may be starting a new pharmacy.
  assert.equal(nextFor("/signup", suspended), null);
});

test("anonymous visitors are moved to the door exactly once", () => {
  const anon = {
    label: "anonymous",
    signedIn: false,
    hasProfile: false,
    hasWorkspace: false,
    suspended: false,
    role: null,
    needsSetup: false,
  };

  for (const route of ["/dashboard", "/pos", "/no-access"]) {
    assert.equal(nextFor(route, anon), "/login");
  }
  assert.equal(nextFor("/login", anon), null);
  assert.equal(nextFor("/", anon), null);
  assert.equal(nextFor("/pricing", anon), null);
});

test("an administrator who never described the organization is held at /organization", () => {
  const blank = {
    label: "google sign-up",
    signedIn: true,
    hasProfile: true,
    hasWorkspace: true,
    suspended: false,
    role: "admin",
    needsSetup: true,
  };

  // Nothing private opens before the details exist…
  assert.equal(nextFor("/dashboard", blank), "/organization");
  assert.equal(nextFor("/pos", blank), "/organization");
  assert.equal(nextFor("/login", blank), "/organization");
  assert.equal(nextFor("/verify-email", blank), "/organization");
  // …and the page itself renders instead of bouncing to itself.
  assert.equal(nextFor("/organization", blank), null);

  // The form's own states are not held: employees, suspended workspaces and
  // the no-membership case each keep their existing destination.
  assert.equal(nextFor("/organization", { ...blank, role: "pharmacist" }), "/pos");
  assert.equal(nextFor("/organization", { ...blank, suspended: true }), "/suspended");
  assert.equal(
    nextFor("/organization", { ...blank, hasWorkspace: false }),
    "/no-access",
  );
  // A workspace that describes itself is never held.
  assert.equal(
    nextFor("/organization", { ...blank, needsSetup: false }),
    "/dashboard",
  );
  assert.equal(nextFor("/dashboard", { ...blank, needsSetup: false }), null);
});
