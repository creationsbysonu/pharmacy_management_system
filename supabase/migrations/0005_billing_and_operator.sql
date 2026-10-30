-- =============================================================================
-- Premium upgrades, customer e-billing and the platform operator
--
-- Apply after 0004_accounts_and_audit.sql. Safe to run more than once.
--
--   * upgrade_request  — a pharmacy asks to move onto a paid plan; the operator
--                        approves or rejects it from /superadmin
--   * invoice_email    — one row per attempt to email a customer their invoice
--   * operator_audit   — every action taken in the Super Admin console
--
-- None of these tables is writable by a normal signed-in account except for the
-- two narrow inserts described below. Plan changes are performed with the
-- service role from the operator console, never from a pharmacy session.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A suspended workspace keeps its data but can no longer be entered. The
-- column already exists; this pins down the values the console writes.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'workspaces_status_check' and conrelid = 'public.workspaces'::regclass
  ) then
    alter table public.workspaces
      add constraint workspaces_status_check check (status in ('active', 'suspended'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Upgrade requests
-- ---------------------------------------------------------------------------
create table if not exists public.upgrade_request (
  id            bigserial primary key,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  requested_by  uuid references auth.users (id) on delete set null,
  plan          text not null check (plan in ('monthly', 'yearly', 'lifetime')),
  contact_name  text,
  contact_email text,
  note          text,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  decision_note text,
  decided_by    text,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);

create index if not exists upgrade_request_workspace_idx
  on public.upgrade_request (workspace_id, created_at desc);
create index if not exists upgrade_request_status_idx
  on public.upgrade_request (status, created_at desc);

-- One open request per pharmacy: keep people from spamming the operator.
create unique index if not exists upgrade_request_one_pending
  on public.upgrade_request (workspace_id)
  where status = 'pending';

alter table public.upgrade_request enable row level security;

drop policy if exists upgrade_request_select on public.upgrade_request;
create policy upgrade_request_select on public.upgrade_request
  for select to authenticated using (is_member(workspace_id));

drop policy if exists upgrade_request_insert on public.upgrade_request;
create policy upgrade_request_insert on public.upgrade_request
  for insert to authenticated
  with check (
    is_member(workspace_id)
    and public.is_admin()
    and requested_by = auth.uid()
  );

-- Requests are decided by the operator (service role); no update/delete policy.

grant select, insert on public.upgrade_request to authenticated;
grant usage, select on sequence public.upgrade_request_id_seq to authenticated;

-- A pharmacy may withdraw its own request before the operator decides.
create or replace function public.withdraw_upgrade_request(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  if not public.is_admin() then
    raise exception 'Only an administrator can withdraw a request.' using errcode = '42501';
  end if;

  update public.upgrade_request r
     set status = 'rejected',
         decision_note = 'Withdrawn by the pharmacy',
         decided_at = now()
   where r.id = p_id
     and r.status = 'pending'
     and r.requested_by = auth.uid()
     and public.is_member(r.workspace_id);
end $$;

revoke execute on function public.withdraw_upgrade_request(bigint) from public, anon;
grant execute on function public.withdraw_upgrade_request(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Customer invoice emails
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_email (
  id           bigserial primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  sale_id      bigint not null,
  to_email     text not null,
  status       text not null check (status in ('sent', 'failed', 'skipped')),
  provider     text not null default 'resend',
  provider_id  text,
  error        text,
  sent_by      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists invoice_email_sale_idx
  on public.invoice_email (sale_id, created_at desc);

alter table public.invoice_email enable row level security;

drop policy if exists invoice_email_select on public.invoice_email;
create policy invoice_email_select on public.invoice_email
  for select to authenticated using (is_member(workspace_id));

drop policy if exists invoice_email_insert on public.invoice_email;
create policy invoice_email_insert on public.invoice_email
  for insert to authenticated
  with check (is_member(workspace_id) and not trial_expired(workspace_id));

grant select, insert on public.invoice_email to authenticated;
grant usage, select on sequence public.invoice_email_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- Platform operator audit
--
-- Only the service role touches this table: RLS is on with no policies and the
-- grants are revoked, so a pharmacy session cannot read or forge a line.
-- ---------------------------------------------------------------------------
create table if not exists public.operator_audit (
  id          bigserial primary key,
  actor_email text,
  action      text not null,
  target      text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists operator_audit_created_idx
  on public.operator_audit (created_at desc);

alter table public.operator_audit enable row level security;
revoke all on public.operator_audit from public, anon, authenticated;
revoke all on sequence public.operator_audit_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Small helper used by the console: the live state of every workspace,
-- including members and the pending request, in one query.
-- ---------------------------------------------------------------------------
create or replace view public.v_operator_workspaces as
  select w.id,
         w.name,
         w.plan,
         w.status,
         w.trial_ends_at,
         w.created_at,
         w.created_by,
         (select count(*) from public.workspace_members m where m.workspace_id = w.id) as member_count,
         (select count(*) from public.meds med where med.workspace_id = w.id) as med_count,
         (select count(*) from public.sales s where s.workspace_id = w.id) as sale_count,
         (select count(*) from public.upgrade_request r
           where r.workspace_id = w.id and r.status = 'pending') as pending_requests
    from public.workspaces w;

revoke all on public.v_operator_workspaces from public, anon, authenticated;
