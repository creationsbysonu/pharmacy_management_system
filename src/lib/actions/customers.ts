"use server";

import { revalidatePath } from "next/cache";
import { requireAdminWritable, requireWritable } from "@/lib/auth";
import { fail, num, ok, str } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

function readCustomer(formData: FormData) {
  return {
    c_fname: str(formData, "c_fname"),
    c_lname: str(formData, "c_lname") || null,
    c_age: num(formData, "c_age"),
    c_sex: str(formData, "c_sex") || null,
    c_phno: str(formData, "c_phno") || null,
    c_mail: str(formData, "c_mail") || null,
  };
}

/** Pharmacists may register customers, so this only requires a profile. */
export async function createCustomer(formData: FormData) {
  const access = await requireWritable("/customers/new");
  const values = readCustomer(formData);
  if (!values.c_fname) fail("/customers/new", "First name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer")
    .insert({ ...values, workspace_id: access.workspaceId });
  if (error) fail("/customers/new", error.message);

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  ok("/customers", `${values.c_fname} added.`);
}

export async function updateCustomer(cId: number, formData: FormData) {
  const editPath = `/customers/${cId}/edit`;
  await requireAdminWritable(editPath);
  const values = readCustomer(formData);
  if (!values.c_fname) fail(editPath, "First name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("customer").update(values).eq("c_id", cId);
  if (error) fail(editPath, error.message);

  revalidatePath("/customers");
  ok("/customers", `${values.c_fname} updated.`);
}

export async function deleteCustomer(cId: number) {
  await requireAdminWritable("/customers");
  const supabase = await createClient();
  const { error } = await supabase.from("customer").delete().eq("c_id", cId);
  if (error) fail("/customers", error.message);

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  ok("/customers", "Customer deleted.");
}
