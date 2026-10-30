import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { InvoiceEmailButton } from "@/components/invoice-email-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyRow, PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/auth";
import { dateTimeLabel, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Sale } from "@/lib/types";
import { Reveal } from "@/components/marketing-motion";

interface SaleDetail extends Sale {
  customer: {
    c_fname: string;
    c_lname: string | null;
    c_phno: string | null;
    c_mail: string | null;
  } | null;
  employee: { e_fname: string; e_lname: string | null } | null;
}

interface SaleLineRow {
  med_id: number;
  sale_qty: number;
  tot_price: number;
  meds: { med_name: string; med_price: number } | null;
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  await requireProfile();
  const { saleId } = await params;
  if (!/^\d+$/.test(saleId)) notFound();

  const supabase = await createClient();
  const [saleResult, itemsResult] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "sale_id, c_id, e_id, sold_at, total_amt, customer!sales_customer_workspace_fk(c_fname, c_lname, c_phno, c_mail), employee!sales_employee_workspace_fk(e_fname, e_lname)"
      )
      .eq("sale_id", Number(saleId))
      .maybeSingle(),
    supabase
      .from("sales_items")
      .select("med_id, sale_qty, tot_price, meds!sales_items_med_workspace_fk(med_name, med_price)")
      .eq("sale_id", Number(saleId))
      .order("med_id"),
  ]);

  const sale = saleResult.data as unknown as SaleDetail | null;
  if (!sale) notFound();

  const items = (itemsResult.data ?? []) as unknown as SaleLineRow[];
  const computed = items.reduce((sum, item) => sum + Number(item.tot_price ?? 0), 0);

  return (
    <>

      <PageHeader
        title={`Invoice #${sale.sale_id}`}
        description={dateTimeLabel(sale.sold_at)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/sales">
                <ArrowLeft /> All sales
              </Link>
            </Button>
            <Button asChild className="gap-1.5">
              <a href={`/api/sales/${sale.sale_id}/invoice`}>
                <Download className="size-4" /> Invoice PDF
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Items sold</CardTitle>
            <CardDescription>{items.length} line items on this invoice.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Medicine</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="pr-4 text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <EmptyRow colSpan={4} message="No line items found." />
                ) : (
                  items.map((item) => (
                    <TableRow key={item.med_id}>
                      <TableCell className="pl-4 font-medium">
                        {item.meds?.med_name ?? `Medicine #${item.med_id}`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {money(item.meds?.med_price ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.sale_qty}</TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">{money(item.tot_price)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-4" colSpan={3}>Total</TableCell>
                  <TableCell className="pr-4 text-right font-semibold tabular-nums">
                    {money(sale.total_amt ?? computed)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Customer</span>
              <span className="text-right font-medium">
                {sale.customer
                  ? `${sale.customer.c_fname} ${sale.customer.c_lname ?? ""}`.trim()
                  : "Walk-in"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span className="text-right">{sale.customer?.c_phno ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="max-w-[60%] truncate text-right">
                {sale.customer?.c_mail ?? "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Recorded by</span>
              <span className="text-right">
                {sale.employee
                  ? `${sale.employee.e_fname} ${sale.employee.e_lname ?? ""}`.trim()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Date</span>
              <span className="text-right">{dateTimeLabel(sale.sold_at)}</span>
            </div>

            <div className="border-t pt-3">
              {sale.customer?.c_mail ? (
                <InvoiceEmailButton saleId={sale.sale_id} email={sale.customer.c_mail} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  No email address on file, so this invoice can only be printed.
                  Add one to the customer record to enable e-billing.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}