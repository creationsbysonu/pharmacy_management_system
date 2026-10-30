import { PosTerminal } from "@/components/pos-terminal";
import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PosPage() {
  await requireProfile();
  const supabase = await createClient();

  const [medsResult, customersResult] = await Promise.all([
    supabase
      .from("meds")
      .select("med_id, med_name, category, location_rack, med_price, med_qty")
      .order("med_name"),
    supabase
      .from("customer")
      .select("c_id, c_fname, c_lname, c_phno")
      .order("c_fname")
      .limit(500),
  ]);

  const meds = (medsResult.data ?? []) as {
    med_id: number;
    med_name: string;
    category: string | null;
    location_rack: string | null;
    med_price: number;
    med_qty: number;
  }[];

  const customers = (customersResult.data ?? []) as {
    c_id: number;
    c_fname: string;
    c_lname: string | null;
    c_phno: string | null;
  }[];

  return (
    <>
      <PageHeader
        title="New sale"
        description="Search for medicines, build the cart, then record the invoice."
      />
      <PosTerminal meds={meds} customers={customers} />
    </>
  );
}
