-- receipt reconciliation rpc

alter table receipts add column if not exists reconciled_at timestamptz;

create or replace function reconcile_receipt(p_receipt_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hh uuid;
  v_reconciled timestamptz;
  v_purchased timestamptz;
  v_tier text;
  v_cap int;
  v_count int;
  v_remaining int;
  v_item jsonb;
  v_added int := 0;
  v_skipped int := 0;
  v_id uuid;
begin
  select household_id, reconciled_at, purchased_at
    into v_hh, v_reconciled, v_purchased
    from receipts
    where id = p_receipt_id and deleted_at is null
    for update;
  if v_hh is null then raise exception 'receipt_not_found'; end if;
  if not is_household_member(v_hh) then raise exception 'forbidden'; end if;
  if v_reconciled is not null then raise exception 'already_reconciled'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'too_many_items'; end if;

  select tier into v_tier from subscriptions where user_id = auth.uid();
  -- mirrors entitlements pantry_item_cap
  v_cap := case when coalesce(v_tier, 'free') = 'free' then 50 else null end;
  if v_cap is not null then
    select count(*) into v_count
      from pantry_items
      where household_id = v_hh and deleted_at is null;
    v_remaining := v_cap - v_count;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_cap is not null and v_remaining <= 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if btrim(coalesce(v_item->>'canonical_name', '')) = ''
       or btrim(coalesce(v_item->>'display_name', '')) = '' then
      raise exception 'invalid_line';
    end if;

    insert into pantry_items (
      household_id, canonical_name, display_name, category, quantity, unit,
      expiration_date, estimated_expiration_days, last_purchased_at, last_unit_cost,
      is_frozen, created_by_user_id, updated_by_user_id
    )
    values (
      v_hh,
      v_item->>'canonical_name',
      v_item->>'display_name',
      coalesce(v_item->>'category', 'other'),
      coalesce(nullif(v_item->>'quantity', '')::numeric, 1),
      coalesce(v_item->>'unit', 'each'),
      nullif(v_item->>'expiration_date', '')::date,
      nullif(v_item->>'estimated_expiration_days', '')::int,
      coalesce(nullif(v_item->>'last_purchased_at', '')::timestamptz, v_purchased),
      nullif(v_item->>'last_unit_cost', '')::numeric,
      coalesce((v_item->>'is_frozen')::boolean, false),
      auth.uid(), auth.uid()
    )
    returning id into v_id;

    insert into pantry_item_history (
      household_id, pantry_item_id, event_type, quantity_delta, unit_cost,
      source_receipt_id, user_id
    )
    values (
      v_hh, v_id, 'purchased',
      coalesce(nullif(v_item->>'quantity', '')::numeric, 1),
      nullif(v_item->>'last_unit_cost', '')::numeric,
      p_receipt_id, auth.uid()
    );

    if v_item ? 'line_item_id' and nullif(v_item->>'line_item_id', '') is not null then
      update receipt_line_items
        set pantry_item_id = v_id
        where id = (v_item->>'line_item_id')::uuid and household_id = v_hh;
    end if;

    v_added := v_added + 1;
    if v_cap is not null then v_remaining := v_remaining - 1; end if;
  end loop;

  if v_added > 0 then
    update receipts set reconciled_at = now() where id = p_receipt_id;
  end if;
  return jsonb_build_object('added', v_added, 'skipped', v_skipped);
end;
$$;

grant execute on function reconcile_receipt(uuid, jsonb) to authenticated;
