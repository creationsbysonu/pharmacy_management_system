import Link from "next/link";
import { KeyRound, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { EmptyRow, Notice, PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/marketing-motion";
import { deleteEmployee } from "@/lib/actions/employees";
import { requireAdmin } from "@/lib/auth";
import { dateLabel, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

interface EmployeeRow extends Employee {
  meds: { med_name: string } | null;
}

function expiryBadge(expDate: string | null) {
  if (!expDate) return <span className="text-muted-foreground">—</span>;

  const days = Math.ceil(
    (new Date(expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (days < 0) return <Badge variant="destructive">Expired</Badge>;
  if (days <= 30) return <Badge variant="outline">{days}d left</Badge>;
  return <span className="text-muted-foreground">{dateLabel(expDate)}</span>;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok: okMessage } = await searchParams;
  await requireAdmin();

  const supabase = await createClient();
  const [{ data }, { data: roster, error: rosterError }] = await Promise.all([
    supabase.from("employee").select("*").order("e_fname", { ascending: true }),
    supabase.from("v_workspace_members").select("employee_id, full_name, role"),
  ]);
  const employees = (data ?? []) as Employee[];

  // employee_id -> login, so each row can show whether the person can sign in.
  const logins = new Map<number, { full_name: string | null; role: string }>();
  for (const member of (roster ?? []) as {
    employee_id: number | null;
    full_name: string | null;
    role: string;
  }[]) {
    if (member.employee_id !== null) {
      logins.set(member.employee_id, { full_name: member.full_name, role: member.role });
    }
  }

  return (
    <>
      <PageHeader
        title="Employees"
        description={`${employees.length} people on the team.`}
        actions={
          <Button asChild>
            <Link href="/employees/new">
              <Plus /> Add employee
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <Notice message={error} />
        </div>
      ) : null}
      {okMessage ? (
        <div className="mb-4">
          <Notice message={okMessage} />
        </div>
      ) : null}

      <Reveal>
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <EmptyRow colSpan={7} message="No employees yet." />
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.e_id}>
                      <TableCell className="font-medium">
                        <span className="block">
                          {employee.e_fname} {employee.e_lname ?? ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          #{employee.e_id}
                          {employee.e_mail ? ` · ${employee.e_mail}` : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.e_type === "Admin" ? "default" : "secondary"}
                        >
                          {employee.e_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dateLabel(employee.e_jdate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.e_phno ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(employee.e_sal)}
                      </TableCell>
                      <TableCell>
                        {rosterError ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : logins.has(employee.e_id) ? (
                          <Badge variant="secondary" className="gap-1">
                            <KeyRound className="size-3" /> Signed in
                          </Badge>
                        ) : (
                          <Button asChild variant="outline" size="sm" className="h-7">
                            <Link href={`/employees/${employee.e_id}/access`}>
                              Give access
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link
                              href={`/employees/${employee.e_id}/edit`}
                              aria-label={`Edit ${employee.e_fname}`}
                            >
                              <Pencil />
                            </Link>
                          </Button>
                          <DeleteButton
                            iconOnly
                            action={deleteEmployee.bind(null, employee.e_id)}
                            title={`Remove ${employee.e_fname}?`}
                            description="Sales already attributed to this employee are kept."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Reveal>
    </>
  );
}