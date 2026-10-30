-- =============================================================================
-- Multi-tenancy + free trial
--
--   * every business table gains a workspace_id
--   * existing rows are backfilled into a permanent "operator" workspace
--   * every new signup gets its own workspace with a 14 day trial
--   * row level security now scopes every read and write by workspace membership
--   * an expired trial turns every write into a no-op (read-only)
--
-- Safe to run more than once.
-- =============================================================================

create extension if not exists pgcrypto;

-- The permanent workspace that already-loaded rows belong to.
create or replace function public.operator_workspace_id()
returns uuid
language sql
immutable
as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;

-- ---------------------------------------------------------------------------
-- Workspaces and membership
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default 'My pharmacy',
  created_by    uuid references auth.users (id) on delete set null,
  plan          text not null default 'trial'
                check (plan in ('trial', 'monthly', 'yearly', 'lifetime')),
  trial_ends_at timestamptz,
  status        text not null default 'active',
  created_at    timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- workspace_id on every business table (existing rows are backfilled by the
-- column default, which also keeps supabase/seed.sql working unchanged)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['suppliers', 'meds', 'customer', 'employee', 'purchase', 'sales', 'sales_items'] loop
    execute format(
      'alter table public.%I add column if not exists workspace_id uuid not null default %L',
      t, '00000000-0000-0000-0000-000000000001'
    );
    execute format('create index if not exists %I on public.%I (workspace_id)',
                   t || '_workspace_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- The operator workspace itself (never expires: this is your own data)
-- ---------------------------------------------------------------------------
insert into public.workspaces (id, name, created_by, plan, trial_ends_at)
values (public.operator_workspace_id(), 'Demo Pharmacy', null, 'lifetime', null)
on conflict (id) do nothing;

-- Accounts that existed before multi-tenancy belong to it. Accounts that
-- already have a workspace keep it, so re-running never crosses tenants.
insert into public.workspace_members (workspace_id, user_id)
select public.operator_workspace_id(), u.id
  from auth.users u
 where not exists (
   select 1 from public.workspace_members m where m.user_id = u.id
 )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Helpers used by the policies below
-- ---------------------------------------------------------------------------
create or replace function public.is_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
     where workspace_id = ws and user_id = auth.uid()
  )
$$;

-- True when the workspace cannot be written to any more.
create or replace function public.trial_expired(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (w.plan = 'trial' and w.trial_ends_at is not null and w.trial_ends_at < now())
      from public.workspaces w where w.id = ws
    ),
    true   -- unknown workspace => fail closed
  )
$$;

-- ---------------------------------------------------------------------------
-- Profiles keep the person's global role; membership decides whose data they
-- see. New signups get their own workspace with a 14 day trial.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws uuid;
begin
  -- Whoever signs up owns the workspace, so they start as its administrator
  -- (the column default is pharmacist, which is for staff added later).
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             split_part(coalesce(new.email, ''), '@', 1)),
    'admin'
  )
  on conflict (id) do nothing;

  insert into public.workspaces (name, created_by, plan, trial_ends_at)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'pharmacy_name'), ''), 'My pharmacy'),
    new.id,
    'trial',
    now() + interval '14 days'
  )
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id) values (ws, new.id);

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security: membership scopes the data, role scopes the capability,
-- trial state gates writes.
-- ---------------------------------------------------------------------------
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;

-- workspaces: read only the ones you belong to.
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces
  for select to authenticated
  using (created_by = auth.uid() or is_member(id));

-- No insert policy on purpose: workspaces are only created by the signup
-- trigger above. If a client could insert one it could also choose
-- plan = 'lifetime' and give itself the product for free. An earlier version
-- of this migration allowed it, so drop it if it is still around.
drop policy if exists workspaces_insert on public.workspaces;

-- workspace_members: read your own rows. Membership is granted by the signup
-- trigger only, so a member can never add themselves (or anyone else) to a
-- workspace they do not own.
drop policy if exists members_select on public.workspace_members;
create policy members_select on public.workspace_members
  for select to authenticated using (user_id = auth.uid());
drop policy if exists members_insert on public.workspace_members;

-- suppliers -----------------------------------------------------------------
drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
  for select to authenticated using (is_member(workspace_id));
drop policy if exists suppliers_admin_write on public.suppliers;
create policy suppliers_admin_write on public.suppliers
  for all to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id))
  with check (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));

-- meds -----------------------------------------------------------------------
drop policy if exists meds_select on public.meds;
create policy meds_select on public.meds
  for select to authenticated using (is_member(workspace_id));
drop policy if exists meds_admin_write on public.meds;
create policy meds_admin_write on public.meds
  for all to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id))
  with check (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));

-- employee -------------------------------------------------------------------
drop policy if exists employee_select on public.employee;
create policy employee_select on public.employee
  for select to authenticated using (is_member(workspace_id));
drop policy if exists employee_admin_write on public.employee;
create policy employee_admin_write on public.employee
  for all to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id))
  with check (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));

-- purchase -------------------------------------------------------------------
drop policy if exists purchase_select on public.purchase;
create policy purchase_select on public.purchase
  for select to authenticated using (is_member(workspace_id));
drop policy if exists purchase_admin_write on public.purchase;
create policy purchase_admin_write on public.purchase
  for all to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id))
  with check (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));

-- customer: everybody in the workspace may read and add --------------------
drop policy if exists customer_select on public.customer;
create policy customer_select on public.customer
  for select to authenticated using (is_member(workspace_id));
drop policy if exists customer_insert on public.customer;
create policy customer_insert on public.customer
  for insert to authenticated
  with check (is_member(workspace_id) and not trial_expired(workspace_id));
drop policy if exists customer_admin_update on public.customer;
create policy customer_admin_update on public.customer
  for update to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id))
  with check (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));
drop policy if exists customer_admin_delete on public.customer;
create policy customer_admin_delete on public.customer
  for delete to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));

-- sales ----------------------------------------------------------------------
drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales
  for select to authenticated using (is_member(workspace_id));
drop policy if exists sales_insert on public.sales;
create policy sales_insert on public.sales
  for insert to authenticated
  with check (is_member(workspace_id) and not trial_expired(workspace_id));
drop policy if exists sales_admin_update on public.sales;
create policy sales_admin_update on public.sales
  for update to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id))
  with check (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));
drop policy if exists sales_admin_delete on public.sales;
create policy sales_admin_delete on public.sales
  for delete to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));

-- sales_items ----------------------------------------------------------------
drop policy if exists sales_items_select on public.sales_items;
create policy sales_items_select on public.sales_items
  for select to authenticated using (is_member(workspace_id));
drop policy if exists sales_items_insert on public.sales_items;
create policy sales_items_insert on public.sales_items
  for insert to authenticated
  with check (is_member(workspace_id) and not trial_expired(workspace_id));
drop policy if exists sales_items_admin_update on public.sales_items;
create policy sales_items_admin_update on public.sales_items
  for update to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id))
  with check (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));
drop policy if exists sales_items_admin_delete on public.sales_items;
create policy sales_items_admin_delete on public.sales_items
  for delete to authenticated
  using (is_member(workspace_id) and is_admin() and not trial_expired(workspace_id));

-- profiles: unchanged (read your own, admins manage all)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Report views still work: security_invoker means RLS applies, and RLS now
-- filters by workspace membership, so a signup never sees anyone else's stock.
-- ---------------------------------------------------------------------------