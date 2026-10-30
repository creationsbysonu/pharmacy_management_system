"use server";

import { revalidatePath } from "next/cache";
import { requireAdminWritable } from "@/lib/auth";
import { dateOrNull, fail, num, ok } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

function readPurchase(formData: FormData) {
  return {
    med_id: num(formData, "med_id"),
    sup_id: num(formData, "sup_id"),
    p_qty: num(formData, "p_qty"),
    p_cost: num(formData, "p_cost") ?? 0,
    pur_date: dateOrNull(formData, "pur_date") ?? new Date().toISOString().slice(0, 10),
    mfg_date: dateOrNull(formData, "mfg_date"),
    exp_date: dateOrNull(formData, "exp_date"),
  };
}

function validate(values: ReturnType<typeof readPurchase>, failPath: string): void {
  if (values.med_id === null) fail(failPath, "Choose the medicine that was purchased.");
  if (values.p_qty === null || values.p_qty <= 0) {
    fail(failPath, "Quantity must be greater than zero.");
  }
  if (values.p_cost < 0) fail(failPath, "Cost cannot be negative.");
}

export async function createPurchase(formData: FormData) {
  const access = await requireAdminWritable("/purchases/new");
  const values = readPurchase(formData);
  validate(values, "/purchases/new");

  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase")
    .insert({ ...values, workspace_id: access.workspaceId });
  if (error) fail("/purchases/new", error.message);

  // The purchase_stock_sync trigger has already added the quantity to stock.
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  ok("/purchases", `Purchase recorded — ${values.p_qty} units added to stock.`);
}

export async function updatePurchase(pId: number, formData: FormData) {
  const editPath = `/purchases/${pId}/edit`;
  await requireAdminWritable(editPath);
  const values = readPurchase(formData);
  validate(values, editPath);

  const supabase = await createClient();
  const { error } = await supabase.from("purchase").update(values).eq("p_id", pId);
  if (error) fail(editPath, error.message);

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  ok("/purchases", "Purchase updated and stock adjusted.");
}

export async function deletePurchase(pId: number) {
  await requireAdminWritable("/purchases");
  const supabase = await createClient();
  const { error } = await supabase.from("purchase").delete().eq("p_id", pId);

  if (error) {
    fail(
      "/purchases",
      "That purchase could not be deleted because removing it would take stock below zero."
    );
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  ok("/purchases", "Purchase deleted and stock adjusted.");
}
