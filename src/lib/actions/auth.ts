"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string } | undefined;

async function origin(): Promise<string> {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;

  // Prefer the trusted deployment URL. Never construct auth links from an
  // attacker-controlled Origin header or an unverified forwarded host.
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin);
      if (parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return parsed.origin;
      }
    } catch {
      // Fall through to the fixed allow-listed request origin.
    }
  }

  const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
  ]);
  if (requestOrigin && allowedOrigins.has(requestOrigin)) return requestOrigin;
  if (host && allowedOrigins.has(`${protocol}://${host}`)) return `${protocol}://${host}`;
  return "http://localhost:3000";
}

/** Never follow off-site redirects. */
function safeNext(raw: string, fallback = "/dashboard"): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) {
    return "An account with that email already exists — sign in instead.";
  }
  if (m.includes("invalid login")) {
    return "That email and password combination was not recognised.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts — wait a minute and try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email address first — check your inbox for the link.";
  }
  if (m.includes("smtp") || m.includes("failed to send")) {
    return "The email could not be sent. Try again shortly.";
  }
  // Don't leak provider internals, SQL errors or configuration details to users.
  return "We couldn't complete that request. Check your details and try again.";
}

export type Portal = "admin" | "staff";

const PORTAL_HOME: Record<Portal, string> = {
  admin: "/dashboard",
  staff: "/pos",
};

/**
 * Sign in at one of the two front doors.
 *
 * The role on the account decides what it can reach, but the door decides what
 * the person is told. An employee who lands on the owner's form is sent to the
 * staff entrance rather than being handed a session that will bounce off every
 * page they open; an owner on the staff form is told the same in reverse.
 */
export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawNext = String(formData.get("next") ?? "").trim();
  const portal: Portal = formData.get("portal") === "staff" ? "staff" : "admin";

  if (!email || !password) {
    return { error: "Enter both your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // An address that was never confirmed cannot sign in at all, so send the
    // person to the screen that can finish the job instead of a dead end.
    if (error.message.toLowerCase().includes("email not confirmed")) {
      redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }
    return { error: readable(error.message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    await supabase.auth.signOut();
    return { error: "That account could not be opened. Try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, employee_id")
    .eq("id", userId)
    .maybeSingle<{ role: "admin" | "pharmacist"; employee_id: number | null }>();

  // A session with no profile cannot reach anything anyway: close it here so
  // the person gets a sentence they can act on instead of a redirect loop.
  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        "This account is not attached to a pharmacy yet. Ask the pharmacy owner to add you, then sign in again.",
    };
  }

  if (portal === "staff" && profile.role !== "pharmacist") {
    await supabase.auth.signOut();
    return {
      error:
        "That is an administrator account. Use the administrator sign-in page instead — employees sign in here.",
    };
  }

  if (portal === "admin" && profile.role !== "admin") {
    await supabase.auth.signOut();
    return {
      error:
        "That is an employee account. Use the employee sign-in page instead — administrators sign in here.",
    };
  }

  redirect(safeNext(rawNext, PORTAL_HOME[portal]));
}

/**
 * Creates an account. The database trigger in setup.sql gives the new account
 * its own workspace with a 14 day trial, so nothing else has to happen here.
 */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const pharmacyName = String(formData.get("pharmacy_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return { error: "Fill in your name, email and password." };
  }
  if (password.length < 12) {
    return { error: "Use at least 12 characters for your password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        pharmacy_name: pharmacyName || "My pharmacy",
      },
      emailRedirectTo: `${await origin()}/auth/confirm`,
    },
  });

  if (error) return { error: readable(error.message) };

  if (!data.session) {
    // Nothing is usable yet: the organization waits for a verified address.
    redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
  }

  // Email confirmation is switched off, so the account is already live.
  redirect("/dashboard");
}

/* -------------------------------------------------------------------------- */
/* Verification: Google, emailed codes, resend                                 */
/* -------------------------------------------------------------------------- */

/**
 * Sign in with Google. Google has already verified the address, so an
 * organization created this way is verified from the first second.
 *
 * The provider has to be switched on in Supabase (Authentication → Providers →
 * Google) with a Google Cloud OAuth client; until then the action returns here
 * with an explanation instead of a broken screen.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(String(formData.get("next") ?? ""), "/dashboard");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    const message = error?.message ?? "Google returned no sign-in URL.";
    redirect(
      `/login?error=${encodeURIComponent(
        /provider is not enabled|unsupported provider/i.test(message)
          ? "Google sign-in is not switched on for this deployment yet."
          : readable(message),
      )}`,
    );
  }

  redirect(data.url);
}

/** Pages that may be the return address for a verification form. */
const VERIFY_PAGES = new Set(["/login", "/staff/login", "/verify-email", "/signup"]);

function verifyPath(raw: string, fallback = "/verify-email"): string {
  return VERIFY_PAGES.has(raw) ? raw : fallback;
}

function backWith(
  page: string,
  params: Record<string, string>,
): never {
  const query = new URLSearchParams(params).toString();
  redirect(`${page}?${query}`);
}

/**
 * Emails a six-digit sign-in code.
 *
 * Deliberately stateless: it redirects back with a message, so the form works
 * without JavaScript and the response never reveals whether an address has an
 * account. Verifying the code also confirms the address, which is how an owner
 * who lost the original link can still finish registering.
 */
export async function sendLoginCode(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const page = verifyPath(String(formData.get("return_to") ?? ""));

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    backWith(page, { email, error: "Enter a valid email address." });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await origin()}/auth/confirm`,
    },
  });

  if (error) backWith(page, { email, error: readable(error.message) });

  backWith(page, {
    email,
    sent: "1",
    message: "If that address has an account, a 6-digit code is on its way. It expires after an hour.",
  });
}

/** Checks the six digits and lets the person in. */
export async function verifyLoginCode(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  const page = verifyPath(String(formData.get("return_to") ?? ""));

  if (!email || !/^\d{6}$/.test(token)) {
    backWith(page, { email, error: "Enter the six digits from the email." });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.user) {
    backWith(page, {
      email,
      error: "That code is not valid or has expired. Send a new one and try again.",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle<{ role: "admin" | "pharmacist" }>();

  if (!profile) {
    await supabase.auth.signOut();
    backWith(page, {
      email,
      error:
        "That email is verified but not attached to a pharmacy. Ask the owner to add you, then sign in again.",
    });
  }

  redirect(profile.role === "admin" ? "/dashboard" : "/pos");
}

/** Sends the verification link again. */
export async function resendVerification(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const page = verifyPath(String(formData.get("return_to") ?? ""));

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    backWith(page, { email, error: "Enter the email you signed up with." });
  }

  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await origin()}/auth/confirm` },
  });

  backWith(page, {
    email,
    resent: "1",
    message: `If ${email} is waiting for verification, a fresh link is on its way.`,
  });
}

export async function forgotPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/recover`,
  });
  if (error) return { error: readable(error.message) };

  // Always the same message: never reveal whether an address has an account.
  return {
    message: "If that address has an account, a password reset link is on its way.",
  };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        error.message.toLowerCase().includes("session")
          ? "This reset link has expired or was already used — request a new one."
          : readable(error.message),
    };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}