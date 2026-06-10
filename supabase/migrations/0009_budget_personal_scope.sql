-- personal budgets are self-write, household-wide read

drop policy if exists budgets_household_isolation on budgets;

create policy budgets_select on budgets
  for select to authenticated
  using (is_household_member(household_id));

create policy budgets_insert on budgets
  for insert to authenticated
  with check (
    is_household_member(household_id)
    and (scope <> 'personal' or user_id = auth.uid())
  );

create policy budgets_update on budgets
  for update to authenticated
  using (
    is_household_member(household_id)
    and (scope <> 'personal' or user_id = auth.uid())
  )
  with check (
    is_household_member(household_id)
    and (scope <> 'personal' or user_id = auth.uid())
  );

create policy budgets_delete on budgets
  for delete to authenticated
  using (
    is_household_member(household_id)
    and (scope <> 'personal' or user_id = auth.uid())
  );
