import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Plans } from "@/components/plans";
import { TRIAL_DAYS } from "@/lib/auth";

export const metadata: Metadata = { title: "Pricing · Pharmacia" };

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Plans and pricing
        </h1>
        <p className="mt-3 text-muted-foreground">
          Start with a {TRIAL_DAYS}-day free trial, then subscribe when you are
          ready. Every plan includes every module.
        </p>
      </div>

      <Plans />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Not ready to decide? Run the full trial first — no card, no commitment.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/">Back to the website</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Try now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}