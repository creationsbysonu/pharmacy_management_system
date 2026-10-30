import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseForm } from "@/components/purchase-form";
import { FormError, PageHeader } from "@/components/page-header";
import { updatePurchase } from "@/lib/actions/purchases";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Purchase } from "@/lib/types";

export default async function EditPurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ pId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { pId } = await params;
  const { error } = await searchParams;

  if (!/^\d+$/.test(pId)) notFound();

  const supabase = await createClient();
  const [purchaseResult, medsResult, suppliersResult] = await Promise.all([
    supabase.from("purchase").select("*").eq("p_id", Number(pId)).maybeSingle<Purchase>(),
    supabase.from("meds").select("med_id, med_name, med_qty").order("med_name"),
    supabase.from("suppliers").select("sup_id, sup_name").order("sup_name"),
  ]);

  const purchase = purchaseResult.data;
  if (!purchase) notFound();

  return (
    <>
      <PageHeader
        title={`Edit purchase #${purchase.p_id}`}
        description="Changing the quantity re-balances stock automatically."
      />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <PurchaseForm
            action={updatePurchase.bind(null, purchase.p_id)}
            purchase={purchase}
            meds={
              (medsResult.data ?? []) as {
                med_id: number;
                med_name: string;
                med_qty: number;
              }[]
            }
            suppliers={
              (suppliersResult.data ?? []) as { sup_id: number; sup_name: string }[]
            }
            cancelHref="/purchases"
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </>
  );
}
