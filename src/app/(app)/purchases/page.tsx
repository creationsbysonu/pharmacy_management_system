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
import { deletePurchase } from "@/lib/actions/purchases";
import { requireAdmin } from "@/lib/auth";
import { dateLabel, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Purchase } from "@/lib/types";

interface PurchaseRow extends Purchase {
  meds: { med_name: string } | null;
  suppliers: { sup_name: string } | null;
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

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok: okMessage } = await searchParams;
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase")
    .select(", meds!purchase_med_workspace_fk(med_name), suppliers!purchase_supplier_workspace_fk(sup_name)")
    .order("pur_date", { ascending: false })
    .order("p_id", { ascending: false });
  const purchases = (data ?? []) as unknown as PurchaseRow[];

  const totalCost = purchases.reduce((sum, row) => sum + Number(row.p_cost ?? 0), 0);

  return (
    <>

      <PageHeader
        title="Purchases"
        description={`${purchases.length} purchase entries · ${money(totalCost)} spent`}
        actions={
          <Button asChild>
            <Link href="/purchases/new">
              <Plus /> Record purchase
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
                  <TableHead>Purchase</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <EmptyRow colSpan={7} message="No purchases recorded yet." />
                ) : (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.p_id}>
                      <TableCell className="font-medium">
                        <span className="block">#{purchase.p_id}</span>
                        <span className="text-xs text-muted-foreground">
                          {dateLabel(purchase.pur_date)}
                        </span>
                      </TableCell>
                      <TableCell>{purchase.meds?.med_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {purchase.suppliers?.sup_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{purchase.p_qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(purchase.p_cost)}</TableCell>
                      <TableCell>{expiryBadge(purchase.exp_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link
                              href={`/purchases/${purchase.p_id}/edit`}
                              aria-label={`Edit purchase ${purchase.p_id}`}
                            >
                              <Pencil />
                            </Link>
                          </Button>
                          <DeleteButton
                            iconOnly
                            action={deletePurchase.bind(null, purchase.p_id)}
                            title={`Delete purchase #${purchase.p_id}?`}
                            description="The quantity will be deducted from stock again."
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