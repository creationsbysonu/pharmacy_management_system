import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/constants";

export type PlanId = "trial" | "monthly" | "yearly" | "lifetime";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  blurb: string;
  cta: string;
  href: string;
  highlight?: boolean;
  features: string[];
}

/**
 * Pricing for one pharmacy, not per seat: every plan carries the whole product
 * and unlimited employee logins. Payments are reviewed by the platform operator
 * (see /upgrade), so the call to action opens a request rather than a card form.
 */
export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Free trial",
    price: "Free",
    period: `for ${TRIAL_DAYS} days`,
    blurb: "The entire product, no card, no sales call.",
    cta: "Start free",
    href: "/signup",
    features: [
      "Every module for the full trial",
      "A private workspace from second one",
      "Unlimited employee logins",
      "Read-only afterwards — nothing deleted",
    ],
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "₹999",
    period: "per month",
    blurb: "For a single pharmacy, billed monthly.",
    cta: "Request Monthly",
    href: "/upgrade?plan=monthly",
    highlight: true,
    features: [
      "Inventory, POS, purchases and suppliers",
      "Customers, employees and roles",
      "Excel and PDF exports",
      "Cancel any time",
    ],
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "₹9,999",
    period: "per year",
    blurb: "Two months free compared to monthly.",
    cta: "Request Yearly",
    href: "/upgrade?plan=yearly",
    features: [
      "Everything in Monthly",
      "Two months free",
      "Priority support",
      "Price locked for twelve months",
    ],
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "₹24,999",
    period: "once",
    blurb: "One payment, the workspace is yours for good.",
    cta: "Request Lifetime",
    href: "/upgrade?plan=lifetime",
    features: [
      "Everything in Yearly",
      "No renewal, ever",
      "Free upgrades to new modules",
      "Transferable if you sell the shop",
    ],
  },
];

export function planById(id: string | undefined | null): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[1];
}

export function isPaidPlan(id: string | undefined | null): boolean {
  return id === "monthly" || id === "yearly" || id === "lifetime";
}

export function Plans({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "card-lift relative flex flex-col rounded-3xl border bg-card/60 p-6",
            plan.highlight
              ? "border-primary/40 shadow-[0_30px_80px_-45px_oklch(0.78_0.16_158_/_0.8)] ring-1 ring-primary/20"
              : "border-border",
          )}
        >
          {plan.highlight ? (
            <Badge className="absolute -top-2.5 left-6">Most popular</Badge>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
            {plan.id === "trial" ? <Check className="size-4 text-primary" /> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{plan.blurb}</p>

          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="font-heading numeric text-3xl font-semibold">{plan.price}</span>
            <span className="text-xs text-muted-foreground">{plan.period}</span>
          </div>

          <ul className="mt-5 flex-1 space-y-2.5 text-sm">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            asChild
            variant={plan.highlight ? "default" : "outline"}
            className="mt-6 w-full"
          >
            <Link href={plan.href}>{plan.cta}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
