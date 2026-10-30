import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeAccessForm } from "@/components/employee-access-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { dateLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

export default async function EmployeeAccessPage({
  params,
}: {
  params: Promise<{ eId: string }>;
}) {
  await requireAdmin();
  const { eId } = await params;
  const employeeId = Number(eId);
  if (!Number.isInteger(employeeId)) notFound();

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employee")
    .select("*")
    .eq("e_id", employeeId)
    .maybeSingle<Employee>();

  if (!employee) notFound();

  // The roster view only exists after migration 0004; degrade quietly.
  const { data: members, error: membersError } = await supabase
    .from("v_workspace_members")
    .select("user_id, full_name, role, employee_id")
    .eq("employee_id", employeeId);

  const linked = (members ?? [])[0] as
    | { user_id: string; full_name: string | null; role: string }
    | undefined;
  const rosterAvailable = !membersError;
  const fullName = `${employee.e_fname} ${employee.e_lname ?? ""}`.trim();

  return (
    <>
      <PageHeader
        title={`Access for ${fullName}`}
        description="Give this person their own sign-in. The role is always Pharmacist."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/employees">
              <ArrowLeft /> Back to employees
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-4" /> Employee record
            </CardTitle>
            <CardDescription>
              Attendance, salary and role are kept here; sign-in credentials are
              separate and belong to the account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{fullName}</span>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Job role</span>
              <Badge variant={employee.e_type === "Admin" ? "default" : "secondary"}>
                {employee.e_type}
              </Badge>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Joined</span>
              <span>{dateLabel(employee.e_jdate)}</span>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Email on file</span>
              <span className="truncate">{employee.e_mail ?? "—"}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Sign-in
            </CardTitle>
            <CardDescription>
              {linked
                ? "This employee already has a login attached."
                : "Create a login, or attach an account they already have."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!rosterAvailable ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Team access needs migration 0004. Run
                <code className="mx-1 rounded bg-background px-1 py-0.5 text-xs">
                  supabase/migrations/0004_accounts_and_audit.sql
                </code>
                in the Supabase SQL editor first.
              </p>
            ) : linked ? (
              <div className="space-y-3 text-sm">
                <p className="rounded-lg bg-success/10 px-3 py-2 text-success">
                  Signed in as {linked.full_name?.trim() || "this employee"} ·{" "}
                  {linked.role === "admin" ? "Administrator" : "Pharmacist"}
                </p>
                <p className="text-muted-foreground">
                  To change the password, ask them to use “Forgot password?” on the
                  sign-in page. To revoke access, remove them from Settings → Team
                  access.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings">Open team access</Link>
                </Button>
              </div>
            ) : (
              <EmployeeAccessForm
                employeeId={employeeId}
                fullName={fullName}
                defaultEmail={employee.e_mail ?? ""}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
