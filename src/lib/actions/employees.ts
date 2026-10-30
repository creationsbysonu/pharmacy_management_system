"use server";

import { revalidatePath } from "next/cache";
import { requireAdminWritable } from "@/lib/auth";
import { dateOrNull, fail, num, ok, str } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

function readEmployee(formData: FormData) {
  return {
    e_fname: str(formData, "e_fname"),
    e_lname: str(formData, "e_lname") || null,
    bdate: dateOrNull(formData, "bdate"),
    e_age: num(formData, "e_age"),
    e_sex: str(formData, "e_sex") || null,
    e_type: str(formData, "e_type") || "Pharmacist",
    e_jdate: dateOrNull(formData, "e_jdate"),
    e_sal: num(formData, "e_sal") ?? 0,
    e_phno: str(formData, "e_phno") || null,
    e_mail: str(formData, "e_mail") || null,
    e_add: str(formData, "e_add") || null,
  };
}

export async function createEmployee(formData: FormData) {
  const access = await requireAdminWritable("/employees/new");
  const values = readEmployee(formData);
  if (!values.e_fname) fail("/employees/new", "First name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee")
    .insert({ ...values, workspace_id: access.workspaceId });
  if (error) fail("/employees/new", error.message);

  revalidatePath("/employees");
  revalidatePath("/dashboard");
  ok("/employees", `${values.e_fname} added to the team.`);
}

export async function updateEmployee(eId: number, formData: FormData) {
  const editPath = `/employees/${eId}/edit`;
  await requireAdminWritable(editPath);
  const values = readEmployee(formData);
  if (!values.e_fname) fail(editPath, "First name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("employee").update(values).eq("e_id", eId);
  if (error) fail(editPath, error.message);

  revalidatePath("/employees");
  ok("/employees", `${values.e_fname} updated.`);
}

export async function deleteEmployee(eId: number) {
  await requireAdminWritable("/employees");
  const supabase = await createClient();
  const { error } = await supabase.from("employee").delete().eq("e_id", eId);
  if (error) fail("/employees", error.message);

  revalidatePath("/employees");
  revalidatePath("/dashboard");
  ok("/employees", "Employee removed.");
}
