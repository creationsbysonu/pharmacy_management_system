"use server";

import { revalidatePath } from "next/cache";
import { requireAdminWritable } from "@/lib/auth";
import { fail, ok, str } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

function readSupplier(formData: FormData) {
  return {
    sup_name: str(formData, "sup_name"),
    sup_add: str(formData, "sup_add"),
    sup_phno: str(formData, "sup_phno"),
    sup_mail: str(formData, "sup_mail"),
  };
}

export async function createSupplier(formData: FormData) {
  const access = await requireAdminWritable("/suppliers/new");
  const values = readSupplier(formData);
  if (!values.sup_name) fail("/suppliers/new", "Supplier name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .insert({ ...values, workspace_id: access.workspaceId });
  if (error) fail("/suppliers/new", error.message);

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  ok("/suppliers", `${values.sup_name} added.`);
}

export async function updateSupplier(supId: number, formData: FormData) {
  const editPath = `/suppliers/${supId}/edit`;
  await requireAdminWritable(editPath);
  const values = readSupplier(formData);
  if (!values.sup_name) fail(editPath, "Supplier name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update(values).eq("sup_id", supId);
  if (error) fail(editPath, error.message);

  revalidatePath("/suppliers");
  ok("/suppliers", `${values.sup_name} updated.`);
}

export async function deleteSupplier(supId: number) {
  await requireAdminWritable("/suppliers");
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("sup_id", supId);
  if (error) fail("/suppliers", error.message);

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  ok("/suppliers", "Supplier deleted.");
}
