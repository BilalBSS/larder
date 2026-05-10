-- rls policies

-- ============================================================================
-- helper function
-- ============================================================================

create or replace function is_household_member(check_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from household_members
    where household_id = check_household_id
      and user_id = auth.uid()
      and deleted_at is null
  );
$$;

revoke all on function is_household_member(uuid) from public;
grant execute on function is_household_member(uuid) to authenticated;

-- ============================================================================
-- enable rls everywhere
-- ============================================================================

alter table households enable row level security;
alter table household_members enable row level security;
alter table canonical_ingredients enable row level security;
alter table pantry_items enable row level security;
alter table pantry_item_history enable row level security;
alter table expiration_overrides enable row level security;
alter table receipts enable row level security;
alter table receipt_line_items enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table recipe_steps enable row level security;
alter table recipe_favorites enable row level security;
alter table recipe_notes enable row level security;
alter table recipe_ratings enable row level security;
alter table cooking_history enable row level security;
alter table shopping_list_items enable row level security;
alter table meal_plans enable row level security;
alter table meal_plan_entries enable row level security;
alter table dietary_preferences enable row level security;
alter table budgets enable row level security;
alter table notification_preferences enable row level security;
alter table notifications_log enable row level security;
alter table subscriptions enable row level security;
alter table recipe_suggestion_cache enable row level security;
alter table user_preferences enable row level security;
alter table recipe_interactions enable row level security;

-- ============================================================================
-- households (bootstrap)
-- ============================================================================

create policy households_select on households
  for select to authenticated
  using (is_household_member(id) and deleted_at is null);

create policy households_insert on households
  for insert to authenticated
  with check (created_by_user_id = auth.uid());

create policy households_update on households
  for update to authenticated
  using (is_household_member(id) and deleted_at is null)
  with check (is_household_member(id));

-- ============================================================================
-- household_members
-- ============================================================================

create policy household_members_select on household_members
  for select to authenticated
  using (is_household_member(household_id) and deleted_at is null);

create policy household_members_insert on household_members
  for insert to authenticated
  with check (
    is_household_member(household_id)
    or user_id = auth.uid()
  );

create policy household_members_update on household_members
  for update to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

-- ============================================================================
-- canonical_ingredients (shared read-only)
-- ============================================================================

create policy canonical_ingredients_select on canonical_ingredients
  for select to authenticated
  using (true);

-- inserts/updates/deletes restricted to service_role (no policy = denied)

-- ============================================================================
-- household-scoped tables WITH deleted_at filter
-- ============================================================================

create policy pantry_items_household_isolation on pantry_items
  for all to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

create policy receipts_household_isolation on receipts
  for all to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

create policy recipes_household_isolation on recipes
  for all to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

create policy recipe_notes_household_isolation on recipe_notes
  for all to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

create policy shopping_list_items_household_isolation on shopping_list_items
  for all to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

create policy meal_plans_household_isolation on meal_plans
  for all to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

create policy budgets_household_isolation on budgets
  for all to authenticated
  using (is_household_member(household_id) and deleted_at is null)
  with check (is_household_member(household_id));

-- ============================================================================
-- household-scoped tables WITHOUT deleted_at
-- ============================================================================

create policy pantry_item_history_household_isolation on pantry_item_history
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy expiration_overrides_household_isolation on expiration_overrides
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy receipt_line_items_household_isolation on receipt_line_items
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy recipe_ingredients_household_isolation on recipe_ingredients
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy recipe_steps_household_isolation on recipe_steps
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy recipe_favorites_household_isolation on recipe_favorites
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy recipe_ratings_household_isolation on recipe_ratings
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy cooking_history_household_isolation on cooking_history
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy meal_plan_entries_household_isolation on meal_plan_entries
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy notifications_log_household_isolation on notifications_log
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy recipe_suggestion_cache_household_isolation on recipe_suggestion_cache
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- ============================================================================
-- per-user tables
-- ============================================================================

create policy notification_preferences_self on notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy dietary_preferences_self on dietary_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy subscriptions_self on subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_preferences_self on user_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- recipe_interactions
-- ============================================================================

create policy recipe_interactions_select on recipe_interactions
  for select to authenticated
  using (user_id = auth.uid() or is_household_member(household_id));

create policy recipe_interactions_insert on recipe_interactions
  for insert to authenticated
  with check (user_id = auth.uid() and is_household_member(household_id));

-- ============================================================================
-- explicit grants (auto-expose disabled in project settings)
-- ============================================================================

grant select, insert, update, delete on
  households,
  household_members,
  pantry_items,
  pantry_item_history,
  expiration_overrides,
  receipts,
  receipt_line_items,
  recipes,
  recipe_ingredients,
  recipe_steps,
  recipe_favorites,
  recipe_notes,
  recipe_ratings,
  cooking_history,
  shopping_list_items,
  meal_plans,
  meal_plan_entries,
  dietary_preferences,
  budgets,
  notification_preferences,
  notifications_log,
  subscriptions,
  recipe_suggestion_cache,
  user_preferences
to authenticated;

grant select, insert on recipe_interactions to authenticated;
grant select on canonical_ingredients to authenticated;
