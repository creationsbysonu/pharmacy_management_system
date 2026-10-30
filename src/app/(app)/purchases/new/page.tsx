import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseForm } from "@/components/purchase-form";
import { FormError, PageHeader } from "@/components/page-header";
import { createPurchase } from "@/lib/actions/purchases";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireAdmin();

  const supabase = await createClient();
  const [medsResult, suppliersResult] = await Promise.all([
    supabase.from("meds").select("med_id, med_name, med_qty").order("med_name"),
    supabase.from("suppliers").select("sup_id, sup_name").order("sup_name"),
  ]);

  const meds = (medsResult.data ?? []) as {
    med_id: number;
    med_name: string;
    med_qty: number;
  }[];
  const suppliers = (suppliersResult.data ?? []) as {
    sup_id: number;
    sup_name: string;
  }[];

  if (meds.length === 0) {
    return (
      <>
        <PageHeader title="Record purchase" />
        <Card className="max-w-3xl">
          <CardContent className="space-y-4">
            <FormError message="Add at least one medicine before recording a purchase." />
            <Button asChild>
              <a href="/inventory/new">Add medicine</a>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Record purchase"
        description="Stock is added to the chosen medicine as soon as you save."
      />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <PurchaseForm
            action={createPurchase}
            meds={meds}
            suppliers={suppliers}
            cancelHref="/purchases"
            submitLabel="Record purchase"
          />
        </CardContent>
      </Card>
    </>
  );
}
