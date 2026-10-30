import Link from "next/link";
import { AlertTriangle, Download, PackageSearch, Search, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { requireProfile } from "@/lib/auth";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const LOW_STOCK_THRESHOLD = 50;

interface StockRow {
  med_id: number;
  med_name: string;
  category: string | null;
  location_rack: string | null;
  med_qty: number;
  med_price: number;
}

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; low?: string }>;
}) {
  await requireProfile();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const category = params.category ?? "all";
  const lowOnly = params.low === "1";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meds")
    .select("med_id, med_name, category, location_rack, med_qty, med_price")
    .order("med_name", { ascending: true })
    .limit(5000);

  const all = (data ?? []) as StockRow[];
  const categories = [...new Set(all.map((row) => row.category).filter(Boolean))].sort() as string[];

  const rows = all.filter((row) => {
    if (category !== "all" && (row.category ?? "") !== category) return false;
    if (lowOnly && row.med_qty > LOW_STOCK_THRESHOLD) return false;
    if (!query) return true;
    return [row.med_name, row.category, row.location_rack]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });

  const stockValue = rows.reduce(
    (sum, row) => sum + Number(row.med_qty ?? 0) * Number(row.med_price ?? 0),
    0,
  );
  const units = rows.reduce((sum, row) => sum + Number(row.med_qty ?? 0), 0);
  const lowCount = all.filter((row) => row.med_qty <= LOW_STOCK_THRESHOLD).length;
  const outCount = all.filter((row) => row.med_qty <= 0).length;

  const exportHref = "/reports/export?type=stock";

  return (
    <>
      <PageHeader
        title="Stock report"
        description="Everything on the shelves, with the reorder line at 50 units."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <a href={exportHref}>
                <Download /> CSV
              </a>
            </Button>
            <ExportButtons kind="stock" search={params.q} />
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Warehouse className="size-3.5" /> Stock value
            </CardDescription>
            <CardTitle className="numeric text-2xl">{money(stockValue)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {units.toLocaleString("en-IN")} units across {rows.length} medicines
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <PackageSearch className="size-3.5" /> Reorder line
            </CardDescription>
            <CardTitle className="numeric text-2xl">{lowCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            At or below {LOW_STOCK_THRESHOLD} units
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" /> Out of stock
            </CardDescription>
            <CardTitle className="numeric text-2xl">{outCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Customers cannot buy these today
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Categories</CardDescription>
            <CardTitle className="numeric text-2xl">{categories.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Distinct categories in stock
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_180px_160px_auto]" action="/reports/stock">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="q"
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Name, rack or category"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={category}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="low">Show</Label>
              <Select name="low" defaultValue={lowOnly ? "1" : "all"}>
                <SelectTrigger id="low" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock</SelectItem>
                  <SelectItem value="1">Needs reordering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply</Button>
              <Button asChild variant="ghost">
                <Link href="/reports/stock">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medicines</CardTitle>
          <CardDescription>
            {rows.length} of {all.length} lines
            {query ? ` matching “${params.q}”` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {error ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{error.message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Medicine</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="pr-4 text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={6} message="No medicines match these filters." />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.med_id}>
                      <TableCell className="pl-4 font-medium">
                        <span className="block">{row.med_name}</span>
                        <span className="text-xs text-muted-foreground">#{row.med_id}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.location_rack ?? "—"}
                      </TableCell>
                      <TableCell className="numeric text-right">
                        {money(row.med_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            row.med_qty <= 0
                              ? "destructive"
                              : row.med_qty <= LOW_STOCK_THRESHOLD
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {row.med_qty}
                        </Badge>
                      </TableCell>
                      <TableCell className="numeric pr-4 text-right">
                        {money(Number(row.med_qty ?? 0) * Number(row.med_price ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-4 font-medium" colSpan={4}>
                    Filtered total
                  </TableCell>
                  <TableCell className="numeric text-right">{units.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="numeric pr-4 text-right">{money(stockValue)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
