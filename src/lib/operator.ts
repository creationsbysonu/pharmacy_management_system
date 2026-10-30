import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * The platform operator (Super Admin) sits above every pharmacy.
 *
 * Two independent locks, because this console can read and change every
 * tenant's data:
 *   1. the signed-in account's email must be in SUPER_ADMIN_EMAIL;
 *   2. the visitor must have typed the private passphrase, which mints a
 *      short-lived HMAC-signed cookie.
 *
 * The cookie is bound to the account id, so copying it to another browser or
 * signing in as a different user does not carry the operator session with it.
 */
const COOKIE = "pharmacia_operator";
const TTL_SECONDS = 60 * 60 * 8;

export const SUPER_ADMIN_ENV_HINT =
  "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSCODE in the environment, then restart the app.";

function operatorEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAIL ?? "")
    .split(/[,;\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = operatorEmails();
  return allowed.length > 0 && allowed.includes(email.toLowerCase());
}

export function operatorConfigured(): boolean {
  return operatorEmails().length > 0 && Boolean(process.env.SUPER_ADMIN_PASSCODE);
}

/** Constant-time comparison of two strings of arbitrary length. */
function safeEqual(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function passcodeMatches(candidate: string): boolean {
  const expected = process.env.SUPER_ADMIN_PASSCODE ?? "";
  if (!expected || candidate.length === 0) return false;
  return safeEqual(candidate, expected);
}

function secret(): string {
  return (
    process.env.SUPER_ADMIN_SECRET ||
    `pharmacia-operator:${process.env.SUPER_ADMIN_PASSCODE ?? "unset"}`
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function mint(userId: string): string {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${userId}:${expires}`;
  return `${payload}:${sign(payload)}`.replace(/:/g, "~");
}

function parse(token: string): { userId: string; expires: number } | null {
  const parts = token.split("~");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;
  const payload = `${userId}:${expiresRaw}`;
  if (!safeEqual(signature, sign(payload))) return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return null;
  return { userId, expires };
}

export async function setOperatorCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, mint(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/superadmin",
    maxAge: TTL_SECONDS,
  });
}

export async function clearOperatorCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export interface OperatorSession {
  userId: string;
  email: string;
}

/** The operator session, or null. Never throws. */
export async function getOperatorSession(): Promise<OperatorSession | null> {
  const user = await getCurrentUser();
  if (!user || !isOperatorEmail(user.email)) return null;

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const parsed = parse(token);
  if (!parsed || parsed.userId !== user.id) return null;

  return { userId: user.id, email: user.email ?? "" };
}

/** Page/action guard: bounce to the gate unless both locks are open. */
export async function requireOperator(): Promise<OperatorSession> {
  const session = await getOperatorSession();
  if (session) return session;

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/superadmin/gate");
  redirect("/superadmin/gate");
}

export function operatorCookiePath(): string {
  return "/superadmin";
}
