import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { MedForm } from "@/components/med-form";
import { FormError, PageHeader } from "@/components/page-header";
import { updateMed } from "@/lib/actions/inventory";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Med } from "@/lib/types";

export default async function EditMedPage({
  params,
  searchParams,
}: {
  params: Promise<{ medId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { medId } = await params;
  const { error } = await searchParams;

  if (!/^\d+$/.test(medId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("meds")
    .select("*")
    .eq("med_id", Number(medId))
    .maybeSingle<Med>();

  if (!data) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${data.med_name}`}
        description={`Medicine #${data.med_id}`}
      />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <MedForm
            action={updateMed.bind(null, data.med_id)}
            med={data}
            cancelHref="/inventory"
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </>
  );
}
