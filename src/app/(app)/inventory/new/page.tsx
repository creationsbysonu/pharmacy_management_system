import { Card, CardContent } from "@/components/ui/card";
import { MedForm } from "@/components/med-form";
import { FormError, PageHeader } from "@/components/page-header";
import { createMed } from "@/lib/actions/inventory";
import { requireAdmin } from "@/lib/auth";

export default async function NewMedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Add medicine"
        description="Create a new line in the inventory."
      />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <MedForm action={createMed} cancelHref="/inventory" submitLabel="Add medicine" />
        </CardContent>
      </Card>
    </>
  );
}
