import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for the "reset your password" email link: exchange the code
 * for a session and hand the user to the new-password form.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/reset-password`);
  }

  return NextResponse.redirect(
    `${origin}/forgot-password?error=${encodeURIComponent("That link is invalid or has expired.")}`
  );
}