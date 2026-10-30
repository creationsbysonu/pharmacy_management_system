import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, MailCheck, Smartphone } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { GoogleMark } from "@/components/auth-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resendVerification,
  sendLoginCode,
  signInWithGoogle,
  verifyLoginCode,
} from "@/lib/actions/auth";
import { getGate } from "@/lib/auth";
import { entranceTarget } from "@/lib/route-rules";

export const metadata = { title: "Confirm your email · Pharmacia" };

/**
 * The last step of registration.
 *
 * Nothing has been created in the database except the account holder's profile:
 * the pharmacy itself is provisioned by the database the moment the address is
 * proved, whether that happens through the link in the email, the six digits
 * below, or Google. This page is the place that explains that, and the place an
 * owner lands when they try to sign in before finishing.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    sent?: string;
    resent?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const { email = "", sent, resent, error, message } = await searchParams;

  // A session that already works has nothing to confirm.
  const target = entranceTarget(await getGate());
  if (target) redirect(target);

  return (
    <AuthShell
      eyebrow="Registration · confirm your email"
      title="One step before your pharmacy exists."
      description="Your workspace is created the moment you prove this address — by the link in your inbox, the six digits below, or Google. Until then nothing is registered."
      points={[
        "The link and the six-digit code both confirm the address",
        "Google sign-in arrives already verified",
        "Phone verification is coming soon and will count the same way",
      ]}
      footer={
        <div className="flex items-center justify-between">
          <Link className="text-xs hover:text-foreground" href="/signup">
            Use a different email
          </Link>
          <Link className="text-xs hover:text-foreground" href="/login">
            Back to sign in
          </Link>
        </div>
      }
    >
      <h2 className="font-heading text-xl font-semibold">Confirm your email</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        {email
          ? `We sent a verification link and a 6-digit code to ${email}.`
          : "Enter the address you signed up with to get a fresh code."}
      </p>

      {error ? (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      {!error && (message || sent || resent) ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-sm text-primary">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {message ??
              "That is done. Check your inbox — the message may take a minute."}
          </span>
        </p>
      ) : null}

      {/* Six digits ------------------------------------------------------- */}
      <form action={verifyLoginCode} className="space-y-3">
        <input type="hidden" name="return_to" value="/verify-email" />

        <div className="space-y-2">
          <Label htmlFor="verify-email">Work email</Label>
          <Input
            id="verify-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            placeholder="you@pharmacy.com"
            className="h-11 bg-background/60"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Six-digit code</Label>
          <Input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            className="h-11 bg-background/60 text-center font-mono text-lg tracking-[0.5em]"
            required
          />
        </div>

        <Button type="submit" className="h-11 w-full">
          Confirm and open my pharmacy
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
          another way to confirm
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      {/* Fresh email ------------------------------------------------------ */}
      <form action={sendLoginCode} className="space-y-3">
        <input type="hidden" name="return_to" value="/verify-email" />
        <input type="hidden" name="email" value={email} />

        <Button type="submit" variant="outline" className="h-11 w-full gap-2">
          <MailCheck className="size-4" />
          Email me a new code
        </Button>
      </form>

      <form action={resendVerification} className="mt-2">
        <input type="hidden" name="return_to" value="/verify-email" />
        <input type="hidden" name="email" value={email} />
        <Button
          type="submit"
          variant="ghost"
          className="h-9 w-full text-xs text-muted-foreground"
        >
          Resend the verification link instead
        </Button>
      </form>

      <form action={signInWithGoogle} className="mt-2">
        <input type="hidden" name="next" value="/dashboard" />
        <Button type="submit" variant="outline" className="h-11 w-full gap-2.5">
          <GoogleMark />
          Continue with Google
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        disabled
        title="Phone verification is not switched on yet"
        className="mt-2 h-11 w-full justify-between px-3 text-muted-foreground"
      >
        <span className="flex items-center gap-2.5">
          <Smartphone className="size-4" />
          Verify by phone number
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          Soon
        </span>
      </Button>

      <div className="mt-4 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-xs text-muted-foreground">
        No code came through? Check spam — or use Google, whose address is
        already verified, so the pharmacy is created the moment you return.
      </div>
    </AuthShell>
  );
}
