"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { Separator } from "@/components/ui/separator";
import { createSale, type SaleLine } from "@/lib/actions/sales";
import { money } from "@/lib/format";

export interface PosMed {
  med_id: number;
  med_name: string;
  category: string | null;
  location_rack: string | null;
  med_price: number;
  med_qty: number;
}

export interface PosCustomer {
  c_id: number;
  c_fname: string;
  c_lname: string | null;
  c_phno: string | null;
}

export function PosTerminal({
  meds,
  customers,
}: {
  meds: PosMed[];
  customers: PosCustomer[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([]);

  const byId = useMemo(
    () => new Map(meds.map((med) => [med.med_id, med])),
    [meds]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return meds.slice(0, 12);
    return meds
      .filter((med) =>
        [med.med_name, med.category ?? "", med.location_rack ?? "", String(med.med_id)]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
      .slice(0, 12);
  }, [meds, query]);

  const total = lines.reduce((sum, line) => {
    const med = byId.get(line.medId);
    return sum + (med ? Number(med.med_price) * line.qty : 0);
  }, 0);

  function addLine(medId: number) {
    const med = byId.get(medId);
    if (!med) return;
    if (med.med_qty <= 0) {
      toast.error(`${med.med_name} is out of stock.`);
      return;
    }
    setLines((current) => {
      const existing = current.find((line) => line.medId === medId);
      if (existing) {
        if (existing.qty >= med.med_qty) {
          toast.error(`Only ${med.med_qty} in stock.`);
          return current;
        }
        return current.map((line) =>
          line.medId === medId ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [...current, { medId, qty: 1 }];
    });
  }

  function setQty(medId: number, qty: number) {
    const med = byId.get(medId);
    if (!med) return;
    const clamped = Math.max(1, Math.min(qty, med.med_qty));
    setLines((current) =>
      current.map((line) => (line.medId === medId ? { ...line, qty: clamped } : line))
    );
  }

  function removeLine(medId: number) {
    setLines((current) => current.filter((line) => line.medId !== medId));
  }

  function completeSale() {
    if (lines.length === 0) {
      toast.error("The cart is empty.");
      return;
    }

    startTransition(async () => {
      const result = await createSale({
        customerId: customerId ? Number(customerId) : null,
        lines,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Sale recorded.");
      setLines([]);
      setCustomerId("");
      router.push(`/sales/${result.saleId}`);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Find a medicine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, category or rack"
              className="pl-8"
            />
          </div>

          <div className="divide-y rounded-lg border">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No medicines matched that search.
              </p>
            ) : (
              filtered.map((med) => (
                <div
                  key={med.med_id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{med.med_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {money(med.med_price)}
                      {med.category ? ` · ${med.category}` : ""}
                      {med.location_rack ? ` · ${med.location_rack}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        med.med_qty <= 0
                          ? "destructive"
                          : med.med_qty <= 50
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {med.med_qty}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={med.med_qty <= 0}
                      onClick={() => addLine(med.med_id)}
                    >
                      <Plus />
                      Add
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-20 lg:self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            Current sale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <NativeSelect
              id="customer"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.c_id} value={customer.c_id}>
                  {customer.c_fname} {customer.c_lname ?? ""}
                  {customer.c_phno ? ` · ${customer.c_phno}` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          <Separator />

          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              The cart is empty. Add medicines from the left.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line) => {
                const med = byId.get(line.medId);
                if (!med) return null;
                return (
                  <div key={line.medId} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{med.med_name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${med.med_name}`}
                        onClick={() => removeLine(line.medId)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Decrease quantity"
                          onClick={() => setQty(line.medId, line.qty - 1)}
                        >
                          <Minus />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={med.med_qty}
                          value={line.qty}
                          onChange={(event) =>
                            setQty(line.medId, Number(event.target.value))
                          }
                          className="w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Increase quantity"
                          disabled={line.qty >= med.med_qty}
                          onClick={() => setQty(line.medId, line.qty + 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <span className="text-sm tabular-nums">
                        {money(Number(med.med_price) * line.qty)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-heading text-xl font-semibold tabular-nums">
              {money(total)}
            </span>
          </div>

          <Button className="w-full" onClick={completeSale} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Saving…" : "Complete sale"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
