import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import type { Med } from "@/lib/types";

const CATEGORIES = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Other"];

export function MedForm({
  action,
  med,
  cancelHref,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  med?: Med;
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="med_name">Medicine name</Label>
          <Input
            id="med_name"
            name="med_name"
            required
            defaultValue={med?.med_name ?? ""}
            placeholder="e.g. Dolo 650 MG"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <NativeSelect
            id="category"
            name="category"
            defaultValue={med?.category ?? "Tablet"}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_rack">Storage rack</Label>
          <Input
            id="location_rack"
            name="location_rack"
            defaultValue={med?.location_rack ?? ""}
            placeholder="e.g. rack 5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="med_price">Price per unit (₹)</Label>
          <Input
            id="med_price"
            name="med_price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={med?.med_price ?? ""}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="med_qty">Quantity in stock</Label>
          <Input
            id="med_qty"
            name="med_qty"
            type="number"
            min="0"
            required
            defaultValue={med?.med_qty ?? 0}
          />
          <p className="text-xs text-muted-foreground">
            Purchases and sales adjust this automatically.
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
