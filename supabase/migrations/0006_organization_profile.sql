-- =============================================================================
-- Organization registry: pharmacy contact details and customer-invoice sender
--
-- Every pharmacy is its own organization: its name, its address, its phone
-- number and the address customers see on an e-bill belong to that workspace
-- and to nobody else's. Nothing here is shared between tenants.
--
-- Apply after 0005_billing_and_operator.sql. Safe to run more than once.
-- =============================================================================

alter table public.workspaces
  add column if not exists email              text,
  add column if not exists phone              text,
  add column if not exists address            text,
  add column if not exists invoice_from_name  text,
  add column if not exists invoice_from_email text;

-- ---------------------------------------------------------------------------
-- One narrow RPC: clients still cannot write workspaces directly, and only an
-- administrator of that workspace may change these details.
-- ---------------------------------------------------------------------------
create or replace function public.update_my_workspace_profile(
  p_name               text default null,
  p_email              text default null,
  p_phone              text default null,
  p_address            text default null,
  p_invoice_from_name  text default null,
  p_invoice_from_email text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace uuid;
  v_email     text := nullif(trim(coalesce(p_email, '')), '');
  v_from      text := nullif(trim(coalesce(p_invoice_from_email, '')), '');
  v_name      text := nullif(trim(coalesce(p_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  if not public.is_admin() then
    raise exception 'Only an administrator can change the pharmacy profile.' using errcode = '42501';
  end if;

  if v_name is not null and length(v_name) < 2 then
    raise exception 'Enter a pharmacy name of at least two characters.' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid pharmacy email address.' using errcode = '22023';
  end if;
  if v_from is not null and v_from !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid sender email address for invoices.' using errcode = '22023';
  end if;

  select m.workspace_id into v_workspace
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
   where m.user_id = auth.uid() and w.status = 'active'
   order by m.created_at asc
   limit 1;

  if v_workspace is null then
    raise exception 'No active pharmacy workspace.' using errcode = '42501';
  end if;
  if public.trial_expired(v_workspace) then
    raise exception 'Your free trial has ended. Subscribe to make changes again.' using errcode = '42501';
  end if;

  update public.workspaces
     set name               = coalesce(v_name, name),
         email              = v_email,
         phone              = nullif(trim(coalesce(p_phone, '')), ''),
         address            = nullif(left(trim(coalesce(p_address, '')), 240), ''),
         invoice_from_name  = nullif(left(trim(coalesce(p_invoice_from_name, '')), 80), ''),
         invoice_from_email = v_from
   where id = v_workspace;
end $$;

revoke execute on function public.update_my_workspace_profile(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.update_my_workspace_profile(text, text, text, text, text, text)
  to authenticated;

-- The console's cross-tenant view gains the new registry columns. Postgres
-- cannot insert columns in the middle of an existing view, so it is dropped and
-- rebuilt; nothing in the app reads it (the console queries the table directly).
drop view if exists public.v_operator_workspaces;

create view public.v_operator_workspaces as
  select w.id,
         w.name,
         w.plan,
         w.status,
         w.trial_ends_at,
         w.created_at,
         w.created_by,
         w.email,
         w.phone,
         w.address,
         w.invoice_from_name,
         w.invoice_from_email,
         (select count(*) from public.workspace_members m where m.workspace_id = w.id) as member_count,
         (select count(*) from public.meds med where med.workspace_id = w.id) as med_count,
         (select count(*) from public.sales s where s.workspace_id = w.id) as sale_count,
         (select count(*) from public.upgrade_request r
           where r.workspace_id = w.id and r.status = 'pending') as pending_requests
    from public.workspaces w;

revoke all on public.v_operator_workspaces from public, anon, authenticated;
