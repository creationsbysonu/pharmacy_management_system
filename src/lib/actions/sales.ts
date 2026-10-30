"use server";

import { revalidatePath } from "next/cache";
import { TRIAL_DAYS, requireAccess, requireAdminWritable } from "@/lib/auth";
import { fail, ok } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

export interface SaleLine {
  medId: number;
  qty: number;
}

export interface SaleResult {
  error?: string;
  saleId?: number;
}

/**
 * Records a sale and its line items. Prices are read from the database rather
 * than trusted from the browser, and stock is verified before anything is
 * written. The sales_item_stock_sync trigger deducts the quantities.
 */
export async function createSale(input: {
  customerId: number | null;
  lines: SaleLine[];
}): Promise<SaleResult> {
  const access = await requireAccess();
  if (access.readOnly) {
    return {
      error: `Your ${TRIAL_DAYS}-day free trial has ended. Subscribe to record sales again — nothing has been deleted.`,
    };
  }
  if (!input || !Array.isArray(input.lines) || input.lines.length > 100) {
    return { error: "The sale request is invalid. Refresh and try again." };
  }
  const customerId = input.customerId;
  if (customerId !== null && (!Number.isSafeInteger(customerId) || customerId <= 0)) {
    return { error: "Select a valid customer." };
  }
  if (input.lines.some((line) => !line || !Number.isSafeInteger(line.medId) || line.medId <= 0 || !Number.isSafeInteger(line.qty) || line.qty <= 0 || line.qty > 100_000)) {
    return { error: "The sale contains an invalid medicine or quantity." };
  }

  const lines = input.lines;
  if (lines.length === 0) {
    return { error: "Add at least one medicine to the sale." };
  }

  const supabase = await createClient();
  const { data: saleId, error } = await supabase.rpc("record_sale", {
    p_customer_id: customerId,
    p_lines: lines.map(({ medId, qty }) => ({ med_id: medId, qty })),
  });

  if (error || !saleId) {
    const message = error?.message.toLowerCase() ?? "";
    if (message.includes("not enough stock")) return { error: "Not enough stock to complete that sale." };
    if (message.includes("expired")) return { error: `Your ${TRIAL_DAYS}-day free trial has ended. Subscribe to record sales again — nothing has been deleted.` };
    if (message.includes("selected customer")) return { error: "The selected customer is not in this pharmacy." };
    return { error: "The sale could not be created. Refresh and try again." };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return { saleId };
}

export async function deleteSale(saleId: number) {
  if (!Number.isSafeInteger(saleId) || saleId <= 0) fail("/sales", "Invalid sale number.");
  await requireAdminWritable("/sales");
  const supabase = await createClient();
  const { error } = await supabase.from("sales").delete().eq("sale_id", saleId);
  if (error) fail("/sales", error.message);

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  ok("/sales", `Sale #${saleId} deleted and stock restored.`);
}
