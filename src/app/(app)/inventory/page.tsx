import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { deleteMed } from "@/lib/actions/inventory";
import { requireProfile } from "@/lib/auth";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Med } from "@/lib/types";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; ok?: string }>;
}) {
  const { q, error, ok: okMessage } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("meds")
    .select("*")
    .order("med_name", { ascending: true })
    .limit(200);

  if (q) {
    query = query.or(`med_name.ilike.%${q}%,category.ilike.%${q}%,location_rack.ilike.%${q}%`);
  }

  const { data, error: queryError } = await query;
  const meds = (data ?? []) as Med[];

  const stockValue = meds.reduce(
    (total, med) => total + Number(med.med_qty) * Number(med.med_price),
    0
  );
  const isAdmin = profile.role === "admin";

  return (
    <>
      <PageHeader
        title="Inventory"
        description={
          q
            ? `${meds.length} result${meds.length === 1 ? "" : "s"} for “${q}”`
            : `${meds.length} medicines · ${money(stockValue)} of stock on hand`
        }
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/inventory/new">
                <Plus />
                Add medicine
              </Link>
            </Button>
          ) : null
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
          <form className="flex gap-2" action="/inventory">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search by name, category or rack"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
            {q ? (
              <Button asChild variant="ghost">
                <Link href="/inventory">Clear</Link>
              </Button>
            ) : null}
          </form>

          {queryError ? (
            <Notice message={queryError.message} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="text-right">Line value</TableHead>
                  {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {meds.length === 0 ? (
                  <EmptyRow
                    colSpan={isAdmin ? 7 : 6}
                    message={q ? "No medicines matched that search." : "No medicines yet."}
                  />
                ) : (
                  meds.map((med) => (
                    <TableRow key={med.med_id}>
                      <TableCell className="font-medium">
                        <span className="block">{med.med_name}</span>
                        <span className="text-xs text-muted-foreground">
                          #{med.med_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {med.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {med.location_rack ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(med.med_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            med.med_qty <= 20
                              ? "destructive"
                              : med.med_qty <= 50
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {med.med_qty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {money(Number(med.med_qty) * Number(med.med_price))}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link
                                href={`/inventory/${med.med_id}/edit`}
                                aria-label={`Edit ${med.med_name}`}
                              >
                                <Pencil />
                              </Link>
                            </Button>
                            <DeleteButton
                              iconOnly
                              action={deleteMed.bind(null, med.med_id)}
                              title={`Delete ${med.med_name}?`}
                              description="This removes the medicine from inventory. It cannot be undone."
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
