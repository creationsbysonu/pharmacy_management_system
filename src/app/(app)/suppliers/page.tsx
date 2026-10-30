import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
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
import { deleteSupplier } from "@/lib/actions/suppliers";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/types";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok: okMessage } = await searchParams;
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .order("sup_name", { ascending: true });
  const suppliers = data ?? [];

  return (
    <>

      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} suppliers on record.`}
        actions={
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus /> Add supplier
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <EmptyRow colSpan={5} message="No suppliers yet." />
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.sup_id}>
                      <TableCell className="font-medium">
                        <span className="block">{supplier.sup_name}</span>
                        <span className="text-xs text-muted-foreground">
                          #{supplier.sup_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.sup_add || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.sup_phno || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.sup_mail || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link
                              href={`/suppliers/${supplier.sup_id}/edit`}
                              aria-label={`Edit ${supplier.sup_name}`}
                            >
                              <Pencil />
                            </Link>
                          </Button>
                          <DeleteButton
                            iconOnly
                            action={deleteSupplier.bind(null, supplier.sup_id)}
                            title={`Delete ${supplier.sup_name}?`}
                            description="Purchases already recorded against this supplier are kept."
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