import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierForm } from "@/components/supplier-form";
import { FormError, PageHeader } from "@/components/page-header";
import { updateSupplier } from "@/lib/actions/suppliers";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/types";

export default async function EditSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ supId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { supId } = await params;
  const { error } = await searchParams;

  if (!/^\d+$/.test(supId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("sup_id", Number(supId))
    .maybeSingle<Supplier>();

  if (!data) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${data.sup_name}`}
        description={`Supplier #${data.sup_id}`}
      />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <SupplierForm
            action={updateSupplier.bind(null, data.sup_id)}
            supplier={data}
            cancelHref="/suppliers"
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </>
  );
}
