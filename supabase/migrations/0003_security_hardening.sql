-- =============================================================================
-- SaaS security hardening
--
-- Apply after 0002_multi_tenant.sql. Safe to run more than once.
-- =============================================================================

-- A workspace administrator must not be able to inspect or promote profiles
-- belonging to another tenant. Account roles are granted only by trusted SQL.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_admin_all on public.profiles;
revoke insert, update, delete on public.profiles from authenticated;

-- Membership is provisioned by the auth trigger, not by untrusted clients.
revoke insert, update, delete on public.workspaces from authenticated;
revoke insert, update, delete on public.workspace_members from authenticated;
grant select on public.workspaces, public.workspace_members, public.profiles to authenticated;

-- Remove broad EXECUTE grants inherited from the initial schema. Trigger
-- functions execute through their installed triggers; only the helpers used
-- by RLS and the controlled sale RPC need to be callable by app users.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.trial_expired(uuid) to authenticated;

-- Composite keys make it impossible to attach a row in one workspace to a
-- parent or medicine owned by another workspace, even through direct API calls.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meds_id_workspace_key' and conrelid = 'public.meds'::regclass) then
    alter table public.meds add constraint meds_id_workspace_key unique (med_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suppliers_id_workspace_key' and conrelid = 'public.suppliers'::regclass) then
    alter table public.suppliers add constraint suppliers_id_workspace_key unique (sup_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customer_id_workspace_key' and conrelid = 'public.customer'::regclass) then
    alter table public.customer add constraint customer_id_workspace_key unique (c_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'employee_id_workspace_key' and conrelid = 'public.employee'::regclass) then
    alter table public.employee add constraint employee_id_workspace_key unique (e_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_id_workspace_key' and conrelid = 'public.sales'::regclass) then
    alter table public.sales add constraint sales_id_workspace_key unique (sale_id, workspace_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'purchase_med_workspace_fk' and conrelid = 'public.purchase'::regclass) then
    alter table public.purchase add constraint purchase_med_workspace_fk
      foreign key (med_id, workspace_id) references public.meds (med_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'purchase_supplier_workspace_fk' and conrelid = 'public.purchase'::regclass) then
    alter table public.purchase add constraint purchase_supplier_workspace_fk
      foreign key (sup_id, workspace_id) references public.suppliers (sup_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_customer_workspace_fk' and conrelid = 'public.sales'::regclass) then
    alter table public.sales add constraint sales_customer_workspace_fk
      foreign key (c_id, workspace_id) references public.customer (c_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_employee_workspace_fk' and conrelid = 'public.sales'::regclass) then
    alter table public.sales add constraint sales_employee_workspace_fk
      foreign key (e_id, workspace_id) references public.employee (e_id, workspace_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_items_sale_workspace_fk' and conrelid = 'public.sales_items'::regclass) then
    alter table public.sales_items add constraint sales_items_sale_workspace_fk
      foreign key (sale_id, workspace_id) references public.sales (sale_id, workspace_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_items_med_workspace_fk' and conrelid = 'public.sales_items'::regclass) then
    alter table public.sales_items add constraint sales_items_med_workspace_fk
      foreign key (med_id, workspace_id) references public.meds (med_id, workspace_id);
  end if;
end $$;

-- Sales may not be forged with arbitrary prices/totals through the Data API.
-- The definer RPC derives every price from locked inventory rows and inserts
-- invoice + line items in one transaction; stock triggers run in that transaction.
drop policy if exists sales_insert on public.sales;
drop policy if exists sales_admin_update on public.sales;
drop policy if exists sales_items_insert on public.sales_items;
drop policy if exists sales_items_admin_update on public.sales_items;
drop policy if exists sales_items_admin_delete on public.sales_items;
revoke insert, update on public.sales from authenticated;
revoke insert, update, delete on public.sales_items from authenticated;
grant select, delete on public.sales to authenticated;
grant select on public.sales_items to authenticated;

create or replace function public.record_sale(p_customer_id integer, p_lines jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
  v_employee integer;
  v_sale integer;
  v_total numeric(10, 2) := 0;
  v_requested record;
  v_med public.meds%rowtype;
  v_items jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select w.id into v_workspace
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
   where m.user_id = v_user and w.status = 'active'
   order by m.created_at asc
   limit 1;
  if v_workspace is null then
    raise exception 'No active pharmacy workspace.' using errcode = '42501';
  end if;
  if public.trial_expired(v_workspace) then
    raise exception 'The workspace trial has expired.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_lines) is distinct from 'array'
     or jsonb_array_length(p_lines) < 1
     or jsonb_array_length(p_lines) > 100 then
    raise exception 'A sale must contain between 1 and 100 medicine lines.' using errcode = '22023';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customer c
     where c.c_id = p_customer_id and c.workspace_id = v_workspace
  ) then
    raise exception 'The selected customer is not in this pharmacy.' using errcode = '22023';
  end if;

  -- Aggregate repeated medicines before locking and inserting, keeping the
  -- sales_items primary key (sale_id, med_id) valid.
  for v_requested in
    select x.med_id, sum(x.qty)::integer as qty
      from jsonb_to_recordset(p_lines) as x(med_id integer, qty integer)
     group by x.med_id
     order by x.med_id
  loop
    if v_requested.med_id is null or v_requested.qty is null or v_requested.qty <= 0 then
      raise exception 'Invalid medicine or quantity.' using errcode = '22023';
    end if;

    select m.* into v_med
      from public.meds m
     where m.med_id = v_requested.med_id and m.workspace_id = v_workspace
     for update;
    if not found then
      raise exception 'A selected medicine is not in this pharmacy.' using errcode = '22023';
    end if;
    if v_med.med_qty < v_requested.qty then
      raise exception 'Not enough stock to complete the sale.' using errcode = '23514';
    end if;

    v_total := v_total + round(v_med.med_price * v_requested.qty, 2);
    if v_total > 99999999.99 then
      raise exception 'The sale total exceeds the supported limit.' using errcode = '22003';
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'med_id', v_med.med_id,
      'qty', v_requested.qty,
      'tot_price', round(v_med.med_price * v_requested.qty, 2)
    ));
  end loop;

  select p.employee_id into v_employee from public.profiles p where p.id = v_user;

  insert into public.sales (c_id, e_id, total_amt, workspace_id)
  values (p_customer_id, v_employee, v_total, v_workspace)
  returning sale_id into v_sale;

  insert into public.sales_items (sale_id, med_id, sale_qty, tot_price, workspace_id)
  select v_sale, i.med_id, i.qty, i.tot_price, v_workspace
    from jsonb_to_recordset(v_items) as i(med_id integer, qty integer, tot_price numeric);

  return v_sale;
end;
$$;

revoke execute on function public.record_sale(integer, jsonb) from public, anon;
grant execute on function public.record_sale(integer, jsonb) to authenticated;
