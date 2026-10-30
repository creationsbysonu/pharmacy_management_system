import Link from "next/link";
import { CalendarClock, Download, IndianRupee, PackageX, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { ExportButtons } from "@/components/export-buttons";
import { EmptyRow, PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { dateLabel, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ExpiringRow } from "@/lib/types";

const HORIZONS = [30, 60, 90, 180] as const;

export default async function ExpiryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ within?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const within = (HORIZONS as readonly number[]).includes(Number(params.within))
    ? Number(params.within)
    : 90;

  const supabase = await createClient();
  const { data } = await supabase.from("v_expiring").select("*");
  const all = (data ?? []) as ExpiringRow[];

  const rows = all.filter((row) => row.days_left <= within);
  const expired = rows.filter((row) => row.days_left < 0);
  const soon = rows.filter((row) => row.days_left >= 0 && row.days_left <= 30);

  // Unit prices come from the stock table, not the batch, so value at risk is
  // an estimate of what cannot be sold once the batch expires.
  const medIds = [...new Set(rows.map((row) => row.med_id))];
  const priceMap = new Map<number, number>();
  if (medIds.length > 0) {
    const { data: meds } = await supabase
      .from("meds")
      .select("med_id, med_price")
      .in("med_id", medIds);
    for (const med of (meds ?? []) as { med_id: number; med_price: number }[]) {
      priceMap.set(med.med_id, Number(med.med_price ?? 0));
    }
  }

  const valueAtRisk = rows.reduce(
    (sum, row) => sum + Number(row.p_qty ?? 0) * (priceMap.get(row.med_id) ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Expiry report"
        description={`Batches expiring within ${within} days, including the ones already past their date.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <a href="/reports/export?type=expiry">
                <Download /> CSV
              </a>
            </Button>
            <ExportButtons kind="expiry" />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
        {HORIZONS.map((horizon) => (
          <Button
            key={horizon}
            asChild
            size="sm"
            variant={within === horizon ? "default" : "ghost"}
          >
            <Link href={`/reports/expiry?within=${horizon}`}>{horizon} days</Link>
          </Button>
        ))}
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CalendarClock className="size-3.5" /> Batches flagged
            </CardDescription>
            <CardTitle className="numeric text-2xl">{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <PackageX className="size-3.5" /> Already expired
            </CardDescription>
            <CardTitle className="numeric text-2xl">{expired.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <ShieldAlert className="size-3.5" /> Within 30 days
            </CardDescription>
            <CardTitle className="numeric text-2xl">{soon.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <IndianRupee className="size-3.5" /> Value at risk
            </CardDescription>
            <CardTitle className="numeric text-2xl">{money(valueAtRisk)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expiring batches</CardTitle>
          <CardDescription>Soonest expiry first.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Medicine</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={5} message={`Nothing expires within ${within} days.`} />
              ) : (
                rows.map((row) => (
                  <TableRow key={row.p_id}>
                    <TableCell className="pl-4 font-medium">
                      <span className="block">{row.med_name}</span>
                      <span className="text-xs text-muted-foreground">
                        Purchase #{row.p_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.sup_name ?? "—"}
                    </TableCell>
                    <TableCell className="numeric text-right">{row.p_qty}</TableCell>
                    <TableCell>{dateLabel(row.exp_date)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      {row.days_left < 0 ? (
                        <Badge variant="destructive">
                          Expired {Math.abs(row.days_left)}d ago
                        </Badge>
                      ) : (
                        <Badge variant={row.days_left <= 30 ? "outline" : "secondary"}>
                          {row.days_left} days left
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-4 font-medium" colSpan={2}>
                  Estimated value at risk
                </TableCell>
                <TableCell className="numeric text-right">
                  {rows.reduce((sum, row) => sum + Number(row.p_qty ?? 0), 0)}
                </TableCell>
                <TableCell colSpan={2} className="numeric pr-4 text-right">
                  {money(valueAtRisk)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
