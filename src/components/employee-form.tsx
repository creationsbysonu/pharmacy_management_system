import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import type { Employee } from "@/lib/types";

const SEXES = ["Female", "Male", "Other"];
const TYPES = ["Admin", "Manager", "Pharmacist"];

export function EmployeeForm({
  action,
  employee,
  cancelHref,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  employee?: Employee;
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="e_fname">First name</Label>
          <Input id="e_fname" name="e_fname" required defaultValue={employee?.e_fname ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_lname">Last name</Label>
          <Input id="e_lname" name="e_lname" defaultValue={employee?.e_lname ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_type">Role</Label>
          <NativeSelect id="e_type" name="e_type" defaultValue={employee?.e_type ?? "Pharmacist"}>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_sal">Monthly salary (₹)</Label>
          <Input
            id="e_sal"
            name="e_sal"
            type="number"
            min="0"
            step="0.01"
            defaultValue={employee?.e_sal ?? 0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bdate">Date of birth</Label>
          <Input id="bdate" name="bdate" type="date" defaultValue={employee?.bdate ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_age">Age</Label>
          <Input
            id="e_age"
            name="e_age"
            type="number"
            min="0"
            max="100"
            defaultValue={employee?.e_age ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_sex">Sex</Label>
          <NativeSelect id="e_sex" name="e_sex" defaultValue={employee?.e_sex ?? "Female"}>
            {SEXES.map((sex) => (
              <option key={sex} value={sex}>
                {sex}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_jdate">Joining date</Label>
          <Input
            id="e_jdate"
            name="e_jdate"
            type="date"
            defaultValue={employee?.e_jdate ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_phno">Phone</Label>
          <Input
            id="e_phno"
            name="e_phno"
            inputMode="tel"
            defaultValue={employee?.e_phno ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="e_mail">Email</Label>
          <Input
            id="e_mail"
            name="e_mail"
            type="email"
            defaultValue={employee?.e_mail ?? ""}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e_add">Address</Label>
          <Input id="e_add" name="e_add" defaultValue={employee?.e_add ?? ""} />
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
