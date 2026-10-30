import { Card, CardContent } from "@/components/ui/card";
import { EmployeeForm } from "@/components/employee-form";
import { FormError, PageHeader } from "@/components/page-header";
import { createEmployee } from "@/lib/actions/employees";
import { requireAdmin } from "@/lib/auth";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireAdmin();

  return (
    <>
      <PageHeader title="Add employee" description="Record a new team member." />
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <FormError message={error} />
          <EmployeeForm
            action={createEmployee}
            cancelHref="/employees"
            submitLabel="Add employee"
          />
        </CardContent>
      </Card>
    </>
  );
}
