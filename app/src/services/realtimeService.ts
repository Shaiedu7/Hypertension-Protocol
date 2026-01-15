import { supabase, TABLES } from './supabase';

type RealtimeSubscription = {
  unsubscribe: () => void;
};

/**
 * Subscribe to all dashboard-relevant tables and trigger the callback
 * whenever anything changes. Debounces rapid events to avoid duplicate reloads.
 */
export function subscribeToDashboardUpdates(onChange: () => void): RealtimeSubscription {
  const channelName = `dashboard-updates-${Math.random().toString(36).slice(2)}`;
  let debounceHandle: ReturnType<typeof setTimeout> | null = null;

  const triggerRefresh = () => {
    if (debounceHandle) return;
    debounceHandle = setTimeout(() => {
      onChange();
      debounceHandle = null;
    }, 150);
  };

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PATIENTS }, triggerRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.EMERGENCY_SESSIONS }, triggerRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.BP_READINGS }, triggerRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.MEDICATIONS }, triggerRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.TIMERS }, triggerRefresh)
    .subscribe();

  const unsubscribe = () => {
    if (debounceHandle) {
      clearTimeout(debounceHandle);
    }
    supabase.removeChannel(channel);
  };

  return { unsubscribe };
}
