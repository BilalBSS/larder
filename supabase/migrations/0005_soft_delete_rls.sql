-- writeable soft-delete policies

drop policy if exists pantry_items_household_isolation on pantry_items;
create policy pantry_items_household_isolation on pantry_items
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists shopping_list_items_household_isolation on shopping_list_items;
create policy shopping_list_items_household_isolation on shopping_list_items
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists receipts_household_isolation on receipts;
create policy receipts_household_isolation on receipts
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists recipes_household_isolation on recipes;
create policy recipes_household_isolation on recipes
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists recipe_notes_household_isolation on recipe_notes;
create policy recipe_notes_household_isolation on recipe_notes
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists meal_plans_household_isolation on meal_plans;
create policy meal_plans_household_isolation on meal_plans
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists budgets_household_isolation on budgets;
create policy budgets_household_isolation on budgets
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));
