-- initial schema

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- updated_at trigger
-- ============================================================================

create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- households + membership
-- ============================================================================

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  household_type text not null check (household_type in ('family','couple','roommates','shared')) default 'family',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid not null references auth.users(id),
  deleted_at timestamptz
);

create index households_created_by_idx on households (created_by_user_id) where deleted_at is null;

create trigger trg_households_updated before update on households
  for each row execute function set_updated_at();

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member','child')),
  joined_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, user_id)
);

create index household_members_user_idx on household_members (user_id) where deleted_at is null;
create index household_members_household_idx on household_members (household_id, deleted_at);

-- ============================================================================
-- canonical ingredients
-- ============================================================================

create table canonical_ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  category text not null check (category in ('produce','dairy','meat','seafood','pantry','frozen','spices','beverages','bakery','household')),
  default_expiration_days integer,
  common_units text[] not null default '{}',
  synonyms text[] not null default '{}',
  nutrition jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index canonical_ingredients_category_idx on canonical_ingredients (category);
create index canonical_ingredients_synonyms_idx on canonical_ingredients using gin (synonyms);
create index canonical_ingredients_nutrition_idx on canonical_ingredients using gin (nutrition);

create trigger trg_canonical_ingredients_updated before update on canonical_ingredients
  for each row execute function set_updated_at();

-- ============================================================================
-- pantry
-- ============================================================================

create table pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  canonical_name text not null,
  display_name text not null,
  category text not null,
  quantity numeric(10,3) not null check (quantity >= 0),
  unit text not null,
  expiration_date date,
  estimated_expiration_days integer,
  last_purchased_at timestamptz,
  last_unit_cost numeric(10,2),
  notes text,
  is_frozen boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid not null references auth.users(id),
  updated_by_user_id uuid not null references auth.users(id),
  deleted_at timestamptz
);

create index pantry_items_household_idx on pantry_items (household_id, deleted_at);
create index pantry_items_expiration_idx on pantry_items (household_id, expiration_date)
  where deleted_at is null and expiration_date is not null;
create index pantry_items_household_expiration_full_idx on pantry_items
  (household_id, expiration_date nulls last, canonical_name)
  where deleted_at is null;
create index pantry_items_canonical_idx on pantry_items (household_id, canonical_name) where deleted_at is null;
create index pantry_items_metadata_idx on pantry_items using gin (metadata);

create trigger trg_pantry_items_updated before update on pantry_items
  for each row execute function set_updated_at();

create table pantry_item_history (
  id uuid primary key default gen_random_uuid(),
  pantry_item_id uuid not null references pantry_items(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  event_type text not null check (event_type in ('purchased','consumed','adjusted','frozen','unfrozen','expired')),
  quantity_delta numeric(10,3),
  unit_cost numeric(10,2),
  source_receipt_id uuid,
  source_recipe_id uuid,
  user_id uuid not null references auth.users(id),
  occurred_at timestamptz not null default now()
);

create index pantry_history_item_idx on pantry_item_history (pantry_item_id, occurred_at desc);
create index pantry_history_household_idx on pantry_item_history (household_id, occurred_at desc);

create table expiration_overrides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category text,
  canonical_name text,
  override_days integer not null check (override_days > 0),
  created_at timestamptz not null default now(),
  unique (household_id, category, canonical_name)
);

create index expiration_overrides_household_idx on expiration_overrides (household_id);

-- ============================================================================
-- receipts
-- ============================================================================

create table receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  scanned_by_user_id uuid not null references auth.users(id),
  store_name text,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  tax_amount numeric(10,2),
  purchased_at timestamptz not null,
  photo_storage_key text not null,
  ocr_status text not null check (ocr_status in ('pending','succeeded','failed','partial')) default 'pending',
  ocr_confidence numeric(4,3),
  ocr_metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, idempotency_key)
);

create index receipts_household_purchased_idx on receipts (household_id, purchased_at desc) where deleted_at is null;
create index receipts_user_idx on receipts (scanned_by_user_id, purchased_at desc) where deleted_at is null;
create index receipts_store_idx on receipts (household_id, store_name) where deleted_at is null;

create trigger trg_receipts_updated before update on receipts
  for each row execute function set_updated_at();

create table receipt_line_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  raw_text text not null,
  canonical_name text,
  category text,
  quantity numeric(10,3),
  unit text,
  unit_price numeric(10,2),
  line_total numeric(10,2) not null,
  pantry_item_id uuid references pantry_items(id),
  created_at timestamptz not null default now()
);

create index line_items_receipt_idx on receipt_line_items (receipt_id);
create index line_items_pantry_idx on receipt_line_items (pantry_item_id) where pantry_item_id is not null;
create index line_items_canonical_idx on receipt_line_items (household_id, canonical_name) where canonical_name is not null;

-- ============================================================================
-- recipes + cooking
-- ============================================================================

create table recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  description text,
  prep_minutes integer,
  cook_minutes integer,
  servings integer not null default 4 check (servings > 0),
  cuisine text,
  difficulty text check (difficulty in ('easy','medium','hard')),
  source text not null check (source in ('llm','user_imported','curated')),
  source_metadata jsonb not null default '{}'::jsonb,
  nutrition jsonb,
  ingredient_total_cost numeric(10,2),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid not null references auth.users(id),
  deleted_at timestamptz
);

create index recipes_household_idx on recipes (household_id, created_at desc) where deleted_at is null;
create index recipes_source_idx on recipes (household_id, source) where deleted_at is null;
create index recipes_nutrition_idx on recipes using gin (nutrition);

create trigger trg_recipes_updated before update on recipes
  for each row execute function set_updated_at();

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  canonical_name text not null,
  quantity numeric(10,3) not null,
  unit text not null,
  is_optional boolean not null default false,
  display_order integer not null,
  notes text
);

create index recipe_ingredients_recipe_idx on recipe_ingredients (recipe_id, display_order);

create table recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  step_number integer not null,
  instruction text not null,
  timer_seconds integer,
  unique (recipe_id, step_number)
);

create index recipe_steps_recipe_idx on recipe_steps (recipe_id, step_number);

create table recipe_favorites (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create index recipe_favorites_user_idx on recipe_favorites (user_id, created_at desc);

create table recipe_notes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index recipe_notes_recipe_idx on recipe_notes (recipe_id, created_at desc) where deleted_at is null;

create trigger trg_recipe_notes_updated before update on recipe_notes
  for each row execute function set_updated_at();

create table recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create index recipe_ratings_recipe_idx on recipe_ratings (recipe_id);

create trigger trg_recipe_ratings_updated before update on recipe_ratings
  for each row execute function set_updated_at();

create table cooking_history (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  cooked_by_user_id uuid not null references auth.users(id),
  servings_cooked integer not null,
  cost_at_cook_time numeric(10,2),
  cooked_at timestamptz not null default now()
);

create index cooking_history_household_idx on cooking_history (household_id, cooked_at desc);
create index cooking_history_recipe_idx on cooking_history (recipe_id, cooked_at desc);

-- ============================================================================
-- shopping list
-- ============================================================================

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  canonical_name text not null,
  display_name text not null,
  quantity numeric(10,3),
  unit text,
  category text,
  added_by_user_id uuid not null references auth.users(id),
  owner_user_id uuid references auth.users(id),
  is_auto_added boolean not null default false,
  is_checked_off boolean not null default false,
  checked_off_at timestamptz,
  checked_off_by_user_id uuid references auth.users(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index shopping_list_household_idx on shopping_list_items (household_id, is_checked_off, created_at desc) where deleted_at is null;
create index shopping_list_owner_idx on shopping_list_items (owner_user_id) where deleted_at is null and owner_user_id is not null;

-- ============================================================================
-- meal plans
-- ============================================================================

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  week_start_date date not null,
  total_projected_cost numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, week_start_date)
);

create index meal_plans_household_idx on meal_plans (household_id, week_start_date desc) where deleted_at is null;

create trigger trg_meal_plans_updated before update on meal_plans
  for each row execute function set_updated_at();

create table meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid not null references recipes(id),
  day_of_week integer not null check (day_of_week between 0 and 6),
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  servings integer not null default 4,
  assigned_to_user_id uuid references auth.users(id),
  is_cooked boolean not null default false,
  cooked_history_id uuid references cooking_history(id),
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index meal_plan_entries_plan_idx on meal_plan_entries (meal_plan_id, day_of_week, meal_type);

-- ============================================================================
-- per-member preferences + budgets
-- ============================================================================

create table dietary_preferences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_type text not null check (preference_type in ('allergy','dislike','diet','cuisine')),
  value text not null,
  severity text check (severity in ('strict','prefer')),
  created_at timestamptz not null default now(),
  unique (user_id, preference_type, value)
);

create index dietary_preferences_user_idx on dietary_preferences (user_id);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id),
  scope text not null check (scope in ('household','personal','category')),
  category text,
  monthly_limit numeric(10,2) not null check (monthly_limit > 0),
  alert_threshold_pct integer not null default 80 check (alert_threshold_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index budgets_household_idx on budgets (household_id, scope) where deleted_at is null;
create index budgets_user_idx on budgets (user_id) where deleted_at is null and user_id is not null;

create trigger trg_budgets_updated before update on budgets
  for each row execute function set_updated_at();

create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  magic_moment_enabled boolean not null default true,
  smart_expiration_enabled boolean not null default true,
  recipe_rescue_enabled boolean not null default true,
  household_activity_enabled boolean not null default true,
  settle_up_enabled boolean not null default true,
  weekly_digest_enabled boolean not null default true,
  smart_reorder_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  expo_push_token text,
  updated_at timestamptz not null default now()
);

create trigger trg_notification_preferences_updated before update on notification_preferences
  for each row execute function set_updated_at();

create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  payload jsonb,
  delivered_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_log_user_idx on notifications_log (user_id, created_at desc);

-- ============================================================================
-- subscriptions (revenuecat sync)
-- ============================================================================

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  revenuecat_user_id text not null unique,
  tier text not null check (tier in ('free','solo_monthly','solo_yearly','household_monthly','household_yearly')) default 'free',
  current_period_start timestamptz,
  current_period_end timestamptz,
  is_active boolean not null default false,
  cancellation_reason text,
  raw_event jsonb,
  updated_at timestamptz not null default now()
);

create index subscriptions_active_idx on subscriptions (is_active, current_period_end) where is_active = true;

create trigger trg_subscriptions_updated before update on subscriptions
  for each row execute function set_updated_at();

-- ============================================================================
-- recipe suggestion cache
-- ============================================================================

create unlogged table recipe_suggestion_cache (
  cache_key text primary key,
  household_id uuid not null references households(id) on delete cascade,
  suggestions jsonb not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index recipe_suggestion_cache_household_idx on recipe_suggestion_cache (household_id, expires_at);

-- ============================================================================
-- per-user explicit preferences
-- ============================================================================

create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cuisines_liked text[] not null default '{}',
  cuisines_disliked text[] not null default '{}',
  ingredients_avoid text[] not null default '{}',
  allergens text[] not null default '{}',
  skill_level text not null check (skill_level in ('beginner','comfortable','confident','advanced')) default 'comfortable',
  preferred_cook_time_min integer not null default 30,
  preferred_servings integer not null default 2,
  daily_calorie_target integer,
  protein_target_g integer,
  carb_target_g integer,
  fat_target_g integer,
  metric_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_preferences_updated before update on user_preferences
  for each row execute function set_updated_at();

-- ============================================================================
-- recipe interaction events
-- ============================================================================

create table recipe_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  event_type text not null check (event_type in (
    'viewed','saved','skipped','regenerated',
    'started_cooking','completed','abandoned'
  )),
  context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index recipe_interactions_user_idx on recipe_interactions (user_id, occurred_at desc);
create index recipe_interactions_recipe_idx on recipe_interactions (recipe_id, event_type);
