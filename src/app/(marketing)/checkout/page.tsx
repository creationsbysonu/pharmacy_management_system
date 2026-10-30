import { redirect } from "next/navigation";

/**
 * The old checkout route. Payments are handled by a reviewed upgrade request
 * (see /upgrade), so every legacy link — including the ones in older emails —
 * lands on the flow that actually works.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const next = ["monthly", "yearly", "lifetime"].includes(plan ?? "")
    ? `/upgrade?plan=${plan}`
    : "/upgrade";
  redirect(next);
}
