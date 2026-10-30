import { NextResponse, type NextRequest } from "next/server";
import { proxyTarget } from "@/lib/route-rules";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Auth gate for page requests.
 *
 * The only decision taken here is "this path is private and there is no
 * session, so send them to the door" — see `proxyTarget` in lib/route-rules.ts.
 * Whether a *signed-in* account may view a page is decided by the pages
 * themselves, against the database, because a JWT alone cannot say whether the
 * account still has a profile or a workspace.
 */
export async function proxy(request: NextRequest) {
  const { response, user, applyCookies } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const target = proxyTarget(pathname, { signedIn: Boolean(user) });
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return applyCookies(NextResponse.redirect(url));
  }

  return applyCookies(response);
}

export const config = {
  // Skip all framework internals and static assets: only real page requests
  // should go through the auth check.
  matcher: ["/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
