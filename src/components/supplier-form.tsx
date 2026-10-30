import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import type { Supplier } from "@/lib/types";

export function SupplierForm({
  action,
  supplier,
  cancelHref,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  supplier?: Supplier;
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sup_name">Supplier name</Label>
          <Input
            id="sup_name"
            name="sup_name"
            required
            defaultValue={supplier?.sup_name ?? ""}
            placeholder="e.g. MedAll Distributors"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sup_add">Address</Label>
          <Input
            id="sup_add"
            name="sup_add"
            defaultValue={supplier?.sup_add ?? ""}
            placeholder="City, State"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sup_phno">Phone</Label>
          <Input
            id="sup_phno"
            name="sup_phno"
            inputMode="tel"
            defaultValue={supplier?.sup_phno ?? ""}
            placeholder="9876543210"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sup_mail">Email</Label>
          <Input
            id="sup_mail"
            name="sup_mail"
            type="email"
            defaultValue={supplier?.sup_mail ?? ""}
            placeholder="orders@supplier.com"
          />
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
