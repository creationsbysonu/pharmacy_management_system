"use server";

import { revalidatePath } from "next/cache";
import { requireAdminWritable } from "@/lib/auth";
import { fail, num, ok, str } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

function readMed(formData: FormData) {
  return {
    med_name: str(formData, "med_name"),
    category: str(formData, "category") || null,
    med_qty: num(formData, "med_qty") ?? 0,
    med_price: num(formData, "med_price") ?? 0,
    location_rack: str(formData, "location_rack") || null,
  };
}

function validate(
  values: ReturnType<typeof readMed>,
  failPath: string
): void {
  if (!values.med_name) fail(failPath, "Medicine name is required.");
  if (values.med_qty < 0) fail(failPath, "Quantity cannot be negative.");
  if (values.med_price < 0) fail(failPath, "Price cannot be negative.");
}

export async function createMed(formData: FormData) {
  const access = await requireAdminWritable("/inventory/new");
  const values = readMed(formData);
  validate(values, "/inventory/new");

  const supabase = await createClient();
  const { error } = await supabase
    .from("meds")
    .insert({ ...values, workspace_id: access.workspaceId });
  if (error) fail("/inventory/new", error.message);

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  ok("/inventory", `${values.med_name} added to inventory.`);
}

export async function updateMed(medId: number, formData: FormData) {
  const editPath = `/inventory/${medId}/edit`;
  await requireAdminWritable(editPath);
  const values = readMed(formData);
  validate(values, editPath);

  const supabase = await createClient();
  const { error } = await supabase.from("meds").update(values).eq("med_id", medId);
  if (error) fail(editPath, error.message);

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  ok("/inventory", `${values.med_name} updated.`);
}

export async function deleteMed(medId: number) {
  await requireAdminWritable("/inventory");
  const supabase = await createClient();
  const { error } = await supabase.from("meds").delete().eq("med_id", medId);

  if (error) {
    fail(
      "/inventory",
      "This medicine appears on recorded sales, so it cannot be deleted. Adjust its quantity instead."
    );
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  ok("/inventory", "Medicine deleted.");
}
