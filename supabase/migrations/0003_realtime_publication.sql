-- realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_list_items'
  ) then
    alter publication supabase_realtime add table shopping_list_items;
  end if;
end $$;
