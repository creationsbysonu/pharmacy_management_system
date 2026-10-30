-- =============================================================================
-- Optional: two demo logins (one admin, one pharmacist)
--
--   admin@pharmacy.local      / Admin@123
--   pharmacist@pharmacy.local / Pharmacy@123
--
-- Prefer your own accounts? Create them in the Supabase dashboard
-- (Authentication -> Users -> Add user, tick "Auto Confirm User"), then run the
-- two UPDATE statements at the bottom of this file with your own email.
--
-- NOTE: roles are assigned explicitly below. They are never taken from signup
-- metadata, because that is attacker controlled.
-- =============================================================================

do $$
declare
  v_id uuid;
begin
  -- Admin ------------------------------------------------------------------
  select id into v_id from auth.users where email = 'admin@pharmacy.local';
  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'admin@pharmacy.local', crypt('Admin@123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrator"}'::jsonb,
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', 'admin@pharmacy.local', 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- Pharmacist --------------------------------------------------------------
  select id into v_id from auth.users where email = 'pharmacist@pharmacy.local';
  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'pharmacist@pharmacy.local', crypt('Pharmacy@123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Varshini Elangovan"}'::jsonb,
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', 'pharmacist@pharmacy.local', 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;
end $$;

-- The handle_new_user trigger has already given each new account an empty
-- workspace of its own. Swap the demo logins into the seeded operator workspace
-- instead, so they can actually see the pharmacy data. This runs as the database
-- owner, which is the only thing allowed to grant membership of it.
delete from public.workspaces
 where created_by in (
   select id from auth.users
    where email in ('admin@pharmacy.local', 'pharmacist@pharmacy.local')
 );

insert into public.workspace_members (workspace_id, user_id)
select public.operator_workspace_id(), u.id
  from auth.users u
 where u.email in ('admin@pharmacy.local', 'pharmacist@pharmacy.local')
on conflict do nothing;

-- Assign the real roles (the trigger never grants admin from signup metadata,
-- because that is attacker controlled).
update public.profiles
   set role = 'admin',
       full_name = 'Administrator',
       employee_id = (select e_id from public.employee where e_type = 'Admin' order by e_id limit 1)
 where id = (select id from auth.users where email = 'admin@pharmacy.local');

update public.profiles
   set role = 'pharmacist',
       full_name = 'Varshini Elangovan',
       employee_id = (select e_id from public.employee where e_mail = 'evarsh@hotmail.com')
 where id = (select id from auth.users where email = 'pharmacist@pharmacy.local');

-- Promoting one of your own accounts instead:
--   update public.profiles
--      set role = 'admin', full_name = 'Your Name'
--    where id = (select id from auth.users where email = 'you@example.com');
