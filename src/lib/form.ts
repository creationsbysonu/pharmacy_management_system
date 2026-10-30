import { redirect } from "next/navigation";

const SAFE_PATHS = new Set([
  "/inventory", "/inventory/new", "/customers", "/customers/new",
  "/suppliers", "/suppliers/new", "/employees", "/employees/new",
  "/purchases", "/purchases/new", "/sales", "/pos", "/settings",
]);

function safeFormPath(path: string): string {
  if (SAFE_PATHS.has(path)) return path;
  if (/^\/(inventory|customers|suppliers|employees|purchases|sales)\/\d+\/edit$/.test(path)) return path;
  return "/dashboard";
}

/** Read a trimmed string field from form data. */
export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Read an optional numeric field; returns null when blank or invalid. */
export function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Read an optional date field (yyyy-mm-dd); returns null when blank. */
export function dateOrNull(formData: FormData, key: string): string | null {
  const raw = str(formData, key);
  return raw === "" ? null : raw;
}

/** Send the user back to a form with a readable error message. */
export function fail(path: string, message: string): never {
  redirect(`${safeFormPath(path)}?error=${encodeURIComponent(message.slice(0, 240))}`);
}

export function ok(path: string, message?: string): never {
  const safePath = safeFormPath(path);
  const query = message ? `?ok=${encodeURIComponent(message.slice(0, 240))}` : "";
  redirect(`${safePath}${query}`);
}
