import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

/**
 * Landing point for Supabase's email links (confirm address, invite, OAuth).
 * Exchanges the one-time code for a session, then carries the user on.
 */
async function handle(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("That link is invalid or has expired.")}`
  );
}

export async function GET(request: NextRequest) {
  return handle(request);
}