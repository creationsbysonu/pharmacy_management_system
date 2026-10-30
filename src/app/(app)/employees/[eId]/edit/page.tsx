import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeForm } from "@/components/employee-form";
import { FormError, PageHeader } from "@/components/page-header";
import { updateEmployee } from "@/lib/actions/employees";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ eId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { eId } = await params;
  const { error } = await searchParams;

  if (!/^\d+$/.test(eId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("employee")
    .select("*")
    .eq("e_id", Number(eId))
    .maybeSingle<Employee>();

  if (!data) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${data.e_fname} ${data.e_lname ?? ""}`.trim()}
        description={`Employee #${data.e_id}`}
      />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <EmployeeForm
            action={updateEmployee.bind(null, data.e_id)}
            employee={data}
            cancelHref="/employees"
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </>
  );
}
