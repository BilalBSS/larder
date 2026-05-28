// / generic table subscription
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';

export interface SubscribeToTableOptions {
  readonly supabase: Pick<SupabaseClient, 'channel' | 'removeChannel'>;
  readonly table: string;
  readonly filter: string; // / e.g. household_id=eq.<uuid>
  readonly onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

export function subscribeToTable(options: SubscribeToTableOptions): () => void {
  const channel: RealtimeChannel = options.supabase.channel(`${options.table}:${options.filter}`);
  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: options.table, filter: options.filter },
      options.onChange,
    )
    .subscribe();
  return () => {
    void options.supabase.removeChannel(channel);
  };
}
