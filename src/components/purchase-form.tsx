import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import { todayISO } from "@/lib/format";
import type { Purchase } from "@/lib/types";

export interface MedOption {
  med_id: number;
  med_name: string;
  med_qty: number;
}

export interface SupplierOption {
  sup_id: number;
  sup_name: string;
}

export function PurchaseForm({
  action,
  purchase,
  meds,
  suppliers,
  cancelHref,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  purchase?: Purchase;
  meds: MedOption[];
  suppliers: SupplierOption[];
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="med_id">Medicine</Label>
          <NativeSelect
            id="med_id"
            name="med_id"
            required
            defaultValue={purchase ? String(purchase.med_id) : ""}
          >
            <option value="" disabled>
              Select a medicine
            </option>
            {meds.map((med) => (
              <option key={med.med_id} value={med.med_id}>
                {med.med_name} (#{med.med_id}) · {med.med_qty} in stock
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sup_id">Supplier</Label>
          <NativeSelect
            id="sup_id"
            name="sup_id"
            defaultValue={purchase?.sup_id ? String(purchase.sup_id) : ""}
          >
            <option value="">Not specified</option>
            {suppliers.map((supplier) => (
              <option key={supplier.sup_id} value={supplier.sup_id}>
                {supplier.sup_name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="p_qty">Quantity purchased</Label>
          <Input
            id="p_qty"
            name="p_qty"
            type="number"
            min="1"
            required
            defaultValue={purchase?.p_qty ?? ""}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Saving adds this quantity to stock automatically.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="p_cost">Total cost (₹)</Label>
          <Input
            id="p_cost"
            name="p_cost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={purchase?.p_cost ?? ""}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pur_date">Purchase date</Label>
          <Input
            id="pur_date"
            name="pur_date"
            type="date"
            defaultValue={purchase?.pur_date ?? todayISO()}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mfg_date">Manufactured on</Label>
          <Input
            id="mfg_date"
            name="mfg_date"
            type="date"
            defaultValue={purchase?.mfg_date ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exp_date">Expires on</Label>
          <Input
            id="exp_date"
            name="exp_date"
            type="date"
            defaultValue={purchase?.exp_date ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Used by the expiry report (next six months).
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
