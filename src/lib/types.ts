export type Role = "admin" | "pharmacist";

/** The subset of the signed-in account the server actually needs. */
export interface SessionUser {
  id: string;
  email: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  employee_id: number | null;
  created_at: string;
}

export interface Supplier {
  sup_id: number;
  sup_name: string;
  sup_add: string;
  sup_phno: string;
  sup_mail: string;
  created_at: string;
}

export interface Med {
  med_id: number;
  med_name: string;
  med_qty: number;
  category: string | null;
  med_price: number;
  location_rack: string | null;
  created_at: string;
}

export interface Customer {
  c_id: number;
  c_fname: string;
  c_lname: string | null;
  c_age: number | null;
  c_sex: string | null;
  c_phno: string | null;
  c_mail: string | null;
  created_at: string;
}

export interface Employee {
  e_id: number;
  e_fname: string;
  e_lname: string | null;
  bdate: string | null;
  e_age: number | null;
  e_sex: string | null;
  e_type: string;
  e_jdate: string | null;
  e_sal: number;
  e_phno: string | null;
  e_mail: string | null;
  e_add: string | null;
  created_at: string;
}

export interface Purchase {
  p_id: number;
  sup_id: number | null;
  med_id: number;
  p_qty: number;
  p_cost: number;
  pur_date: string;
  mfg_date: string | null;
  exp_date: string | null;
  created_at: string;
}

export interface Sale {
  sale_id: number;
  c_id: number | null;
  e_id: number | null;
  sold_at: string;
  total_amt: number;
}

export interface SaleItem {
  sale_id: number;
  med_id: number;
  sale_qty: number;
  tot_price: number;
}

export interface LowStockRow {
  med_id: number;
  med_name: string;
  med_qty: number;
  category: string | null;
  med_price: number;
  location_rack: string | null;
}

export interface ExpiringRow {
  p_id: number;
  exp_date: string;
  p_qty: number;
  med_id: number;
  med_name: string;
  sup_name: string | null;
  days_left: number;
}
