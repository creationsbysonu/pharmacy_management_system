import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import type { Customer } from "@/lib/types";

const SEXES = ["Female", "Male", "Other"];

export function CustomerForm({
  action,
  customer,
  cancelHref,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  customer?: Customer;
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="c_fname">First name</Label>
          <Input
            id="c_fname"
            name="c_fname"
            required
            defaultValue={customer?.c_fname ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_lname">Last name</Label>
          <Input id="c_lname" name="c_lname" defaultValue={customer?.c_lname ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_age">Age</Label>
          <Input
            id="c_age"
            name="c_age"
            type="number"
            min="0"
            max="130"
            defaultValue={customer?.c_age ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_sex">Sex</Label>
          <NativeSelect id="c_sex" name="c_sex" defaultValue={customer?.c_sex ?? "Female"}>
            {SEXES.map((sex) => (
              <option key={sex} value={sex}>
                {sex}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_phno">Phone</Label>
          <Input
            id="c_phno"
            name="c_phno"
            inputMode="tel"
            defaultValue={customer?.c_phno ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c_mail">Email</Label>
          <Input
            id="c_mail"
            name="c_mail"
            type="email"
            defaultValue={customer?.c_mail ?? ""}
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
