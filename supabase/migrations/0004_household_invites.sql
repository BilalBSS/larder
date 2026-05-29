-- household invites + secure membership rpcs

-- ============================================================================
-- household_invites
-- ============================================================================

create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  role text not null check (role in ('member','child')),
  token uuid not null unique default gen_random_uuid(),
  invited_by_user_id uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index household_invites_household_idx on household_invites (household_id);
create index household_invites_token_idx on household_invites (token);

alter table household_invites enable row level security;

-- members manage their own invites; token stays secret (no blanket select)
create policy household_invites_select on household_invites
  for select to authenticated
  using (is_household_member(household_id));

create policy household_invites_insert on household_invites
  for insert to authenticated
  with check (is_household_member(household_id));

create policy household_invites_update on household_invites
  for update to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- ============================================================================
-- create household + owner atomically
-- ============================================================================

create or replace function create_household_with_owner(p_name text, p_type text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_household_id uuid;
begin
  if p_type not in ('family','couple','roommates','shared') then
    raise exception 'invalid household_type %', p_type;
  end if;

  insert into households (name, household_type, created_by_user_id)
  values (p_name, p_type, auth.uid())
  returning id into new_household_id;

  insert into household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  return new_household_id;
end;
$$;

revoke all on function create_household_with_owner(text, text) from public;
grant execute on function create_household_with_owner(text, text) to authenticated;

-- ============================================================================
-- accept invite -> membership
-- ============================================================================

create or replace function accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite household_invites%rowtype;
begin
  select * into invite
  from household_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;
  if invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;
  if invite.accepted_at is not null then
    raise exception 'invite_already_accepted';
  end if;

  -- unique(household_id, user_id) fails closed on double-join
  insert into household_members (household_id, user_id, role)
  values (invite.household_id, auth.uid(), invite.role);

  update household_invites
  set accepted_at = now(),
      accepted_by_user_id = auth.uid()
  where id = invite.id;

  return invite.household_id;
end;
$$;

revoke all on function accept_invite(uuid) from public;
grant execute on function accept_invite(uuid) to authenticated;

-- ============================================================================
-- close the client-side self-insert escape hatch
-- ============================================================================

drop policy household_members_insert on household_members;

create policy household_members_insert on household_members
  for insert to authenticated
  with check (is_household_member(household_id));

-- ============================================================================
-- grants (auto-expose disabled in project settings)
-- ============================================================================

grant select, insert, update on household_invites to authenticated;
