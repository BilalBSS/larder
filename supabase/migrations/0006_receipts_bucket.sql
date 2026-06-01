-- private receipts storage bucket

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- members read/write objects under their household folder
-- client MUST upload to `${household_id}/${uuid}.jpg`; a non-uuid first
-- segment raises 22P02 in the cast and the write is rejected

create policy receipts_obj_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy receipts_obj_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );
