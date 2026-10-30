import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/actions/auth";

/** Google's four-colour mark, drawn inline so the page ships no extra asset. */
export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.56-5.17 3.56-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.26a12 12 0 0 0 0 10.72l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.64l3.99 3.09C6.2 6.88 8.86 4.75 12 4.75Z"
      />
    </svg>
  );
}

/**
 * The two ways in that are not "type your password": Google, which proves the
 * address for us, and a phone number, which is visibly on the way but not yet
 * wired up. Both sit above the email form on every entrance so a person with a
 * Google account never has to invent a password.
 */
export function AuthProviders({
  next = "/dashboard",
  googleLabel = "Continue with Google",
}: {
  next?: string;
  googleLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" className="h-11 w-full gap-2.5">
          <GoogleMark />
          {googleLabel}
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        disabled
        aria-describedby="phone-coming-soon"
        title="Phone sign-in is not switched on yet"
        className="h-11 w-full justify-between px-3 text-muted-foreground"
      >
        <span className="flex items-center gap-2.5">
          <Smartphone className="size-4" />
          Continue with phone number
        </span>
        <span
          id="phone-coming-soon"
          className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
        >
          Soon
        </span>
      </Button>

      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
          or use your password
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
    </div>
  );
}
