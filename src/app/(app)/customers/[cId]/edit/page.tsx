import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "@/components/customer-form";
import { FormError, PageHeader } from "@/components/page-header";
import { updateCustomer } from "@/lib/actions/customers";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ cId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { cId } = await params;
  const { error } = await searchParams;

  if (!/^\d+$/.test(cId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("customer")
    .select("*")
    .eq("c_id", Number(cId))
    .maybeSingle<Customer>();

  if (!data) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${data.c_fname} ${data.c_lname ?? ""}`.trim()}
        description={`Customer #${data.c_id}`}
      />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <CustomerForm
            action={updateCustomer.bind(null, data.c_id)}
            customer={data}
            cancelHref="/customers"
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </>
  );
}
