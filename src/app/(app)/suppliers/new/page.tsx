import { Card, CardContent } from "@/components/ui/card";
import { SupplierForm } from "@/components/supplier-form";
import { FormError, PageHeader } from "@/components/page-header";
import { createSupplier } from "@/lib/actions/suppliers";
import { requireAdmin } from "@/lib/auth";

export default async function NewSupplierPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireAdmin();

  return (
    <>
      <PageHeader title="Add supplier" description="Record who you buy stock from." />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <SupplierForm
            action={createSupplier}
            cancelHref="/suppliers"
            submitLabel="Add supplier"
          />
        </CardContent>
      </Card>
    </>
  );
}
