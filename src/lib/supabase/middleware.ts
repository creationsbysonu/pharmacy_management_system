import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SessionUser } from "@/lib/types";

/** Cookie name prefix Supabase SSR writes the session into. */
const AUTH_COOKIE = /^sb-.*-auth-token(\.\d+)?$/;

/**
 * Refreshes the Supabase auth session when needed and returns the current user.
 *
 * `getClaims()` verifies the JWT locally (via the cached JWKS) when the project
 * uses asymmetric signing keys, instead of asking the Auth server on every
 * navigation like `getUser()` does. Only the id and email are needed here; a
 * full user record is fetched in the app layout where rows are actually read.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  let response = NextResponse.next({ request });
  let refreshedCookies: {
    name: string;
    value: string;
    options?: Parameters<typeof response.cookies.set>[2];
  }[] = [];

  const applyCookies = (target: NextResponse) => {
    refreshedCookies.forEach(({ name, value, options }) =>
      target.cookies.set(name, value, options)
    );
    return target;
  };

  // Anonymous visitor: no cookie means no session, so this is a pure CPU check.
  const hasSession = request.cookies.getAll().some((cookie) => AUTH_COOKIE.test(cookie.name));
  if (!hasSession) {
    return { response, user: null as SessionUser | null, applyCookies };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        refreshedCookies = cookiesToSet;
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    // Do not turn a transient Auth outage into a fabricated authenticated session.
    return { response, user: null as SessionUser | null, applyCookies };
  }

  return {
    response,
    user: { id: claims.sub, email: claims.email ?? null } as SessionUser | null,
    applyCookies,
  };
}
