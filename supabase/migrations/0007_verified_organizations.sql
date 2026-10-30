-- =============================================================================
-- An organization exists only once its owner has proved the address
--
-- Until now every signup created a pharmacy workspace immediately, before the
-- person had confirmed anything. That made "register a free pharmacy" a thing
-- anyone could do with a fake address, and left half-finished trials behind.
--
-- From here the order is:
--   1. sign up            -> a profile is created, no workspace
--   2. click the link,    -> Supabase stamps auth.users.email_confirmed_at
--      enter the 6 digits,   (or phone_confirmed_at); the trigger below turns
--      or use Google         that stamp into the pharmacy workspace + trial
--   3. signed in          -> the workspace already exists
--
-- Google (and every other OAuth provider) hands Supabase an address that is
-- verified by the provider, so those accounts are provisioned on insert.
--
-- Apply after 0006_organization_profile.sql (it uses workspaces.email).
-- Safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- One function creates the organization: profile role decides whether the
-- account is an owner (gets a pharmacy) or staff (belongs to someone else's).
-- ---------------------------------------------------------------------------
create or replace function public.provision_organization(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ws    uuid;
  v_role  text;
  v_meta  jsonb;
  v_email text;
begin
  select p.role into v_role from public.profiles p where p.id = p_user;
  if v_role is null or v_role <> 'admin' then
    return null;  -- staff never get a pharmacy of their own
  end if;

  -- Idempotent: a confirm-link click and a typed code can both land here.
  select m.workspace_id into v_ws
    from public.workspace_members m
   where m.user_id = p_user
   order by m.created_at asc
   limit 1;
  if v_ws is not null then
    return v_ws;
  end if;

  select u.raw_user_meta_data, u.email into v_meta, v_email
    from auth.users u
   where u.id = p_user;

  insert into public.workspaces (name, created_by, plan, trial_ends_at, email)
  values (
    coalesce(nullif(trim(v_meta ->> 'pharmacy_name'), ''), 'My pharmacy'),
    p_user,
    'trial',
    now() + interval '14 days',
    v_email
  )
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id)
  values (v_ws, p_user);

  return v_ws;
end $$;

-- Internal only: nothing may call this with somebody else's id.
revoke execute on function public.provision_organization(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Signup: profile only. No organization yet.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  -- A provider-verified address (Google, Apple, …) or a verified phone is
  -- proof enough, so those accounts get their pharmacy straight away.
  if new.email_confirmed_at is not null or new.phone_confirmed_at is not null then
    perform public.provision_organization(new.id);
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Verification: the click, the six digits and the phone code all update
-- auth.users. That update is what creates the organization.
-- ---------------------------------------------------------------------------
create or replace function public.handle_user_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_organization(new.id);
  return new;
end $$;

revoke execute on function public.handle_user_verified()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
  after update of email_confirmed_at, phone_confirmed_at on auth.users
  for each row
  when (
    old.email_confirmed_at is distinct from new.email_confirmed_at
    or old.phone_confirmed_at is distinct from new.phone_confirmed_at
  )
  execute function public.handle_user_verified();

-- ---------------------------------------------------------------------------
-- Existing accounts: anyone whose address is confirmed but who somehow has no
-- workspace (a signup interrupted between the two triggers) gets one now.
-- Unconfirmed signups are deliberately left without an organization.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select u.id
      from auth.users u
      join public.profiles p on p.id = u.id and p.role = 'admin'
     where (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
       and not exists (
         select 1 from public.workspace_members m where m.user_id = u.id
       )
  loop
    perform public.provision_organization(r.id);
  end loop;
end $$;
