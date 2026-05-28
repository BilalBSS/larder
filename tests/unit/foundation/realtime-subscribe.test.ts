import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { subscribeToTable } from '@foundation/realtime/subscribe';

function makeFakeSupabase() {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
  };
  const channelFactory = vi.fn(() => channel);
  const removeChannel = vi.fn();
  const supabase = {
    channel: channelFactory,
    removeChannel,
  } as unknown as Pick<SupabaseClient, 'channel' | 'removeChannel'>;
  return { supabase, channel, channelFactory, removeChannel };
}

describe('subscribeToTable', () => {
  it('wires channel, postgres_changes, and subscribe', () => {
    const { supabase, channel, channelFactory } = makeFakeSupabase();
    const onChange = vi.fn();

    subscribeToTable({
      supabase,
      table: 'shopping_list_items',
      filter: 'household_id=eq.h-1',
      onChange,
    });

    expect(channelFactory).toHaveBeenCalledWith('shopping_list_items:household_id=eq.h-1');
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shopping_list_items',
        filter: 'household_id=eq.h-1',
      },
      onChange,
    );
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe removes the channel', () => {
    const { supabase, channel, removeChannel } = makeFakeSupabase();

    const unsubscribe = subscribeToTable({
      supabase,
      table: 'shopping_list_items',
      filter: 'household_id=eq.h-1',
      onChange: vi.fn(),
    });
    unsubscribe();

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
