import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { deleteCustomer } from "@/lib/actions/customers";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; ok?: string }>;
}) {
  const { q, error, ok: okMessage } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("customer")
    .select("*")
    .order("c_fname", { ascending: true })
    .limit(200);

  if (q) {
    query = query.or(
      `c_fname.ilike.%${q}%,c_lname.ilike.%${q}%,c_phno.ilike.%${q}%,c_mail.ilike.%${q}%`
    );
  }

  const { data } = await query;
  const customers = (data ?? []) as Customer[];
  const isAdmin = profile.role === "admin";

  return (
    <>
      <PageHeader
        title="Customers"
        description={
          q
            ? `${customers.length} result${customers.length === 1 ? "" : "s"} for “${q}”`
            : `${customers.length} customers on record.`
        }
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus />
              Add customer
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

      <Card>
        <CardContent className="space-y-4">
          <form className="flex gap-2" action="/customers">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search by name, phone or email"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
            {q ? (
              <Button asChild variant="ghost">
                <Link href="/customers">Clear</Link>
              </Button>
            ) : null}
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Age / Sex</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <EmptyRow
                  colSpan={isAdmin ? 5 : 4}
                  message={q ? "No customers matched that search." : "No customers yet."}
                />
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.c_id}>
                    <TableCell className="font-medium">
                      <span className="block">
                        {customer.c_fname} {customer.c_lname ?? ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        #{customer.c_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[customer.c_age ?? "—", customer.c_sex ?? "—"].join(" / ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.c_phno ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.c_mail ?? "—"}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link
                              href={`/customers/${customer.c_id}/edit`}
                              aria-label={`Edit ${customer.c_fname}`}
                            >
                              <Pencil />
                            </Link>
                          </Button>
                          <DeleteButton
                            iconOnly
                            action={deleteCustomer.bind(null, customer.c_id)}
                            title={`Delete ${customer.c_fname}?`}
                            description="Sales already recorded for this customer are kept."
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
