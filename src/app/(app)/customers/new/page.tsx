import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "@/components/customer-form";
import { FormError, PageHeader } from "@/components/page-header";
import { createCustomer } from "@/lib/actions/customers";
import { requireProfile } from "@/lib/auth";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireProfile();

  return (
    <>
      <PageHeader title="Add customer" description="Register a new customer." />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <CustomerForm
            action={createCustomer}
            cancelHref="/customers"
            submitLabel="Add customer"
          />
        </CardContent>
      </Card>
    </>
  );
}
