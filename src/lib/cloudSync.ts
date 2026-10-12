import { useEffect, useRef, useState } from 'react';

import { useAuth } from './auth';
import { useSettings, type Settings } from './settings';
import { supabase } from './supabase';

// Keeps your preferences in Supabase (table `user_settings`, one row per user) so they follow
// you to a new phone. Device-specific or secret values stay on the phone only.

const SYNCED = [
  'graceMin',
  'defaultMode',
  'notifications',
  'headsUpMin',
  'lookAheadHours',
  'leaveTimeStyle',
  'modeOverrides',
  'graceOverrides',
  'notifyOverrides',
  'originOverrides',
] as const satisfies readonly (keyof Settings)[];

type SyncedSettings = Pick<Settings, (typeof SYNCED)[number]>;

function pick(s: Settings): SyncedSettings {
  return Object.fromEntries(SYNCED.map((k) => [k, s[k]])) as SyncedSettings;
}

const PUSH_DELAY_MS = 1500;

function useCloudSettings() {
  const { account } = useAuth();
  const { settings, ready, update } = useSettings();
  const userId = account?.id ?? null;
  // JSON of what the server has, so pulled values aren't pushed straight back.
  const remote = useRef('');
  // Which user's row has been pulled. Nothing is pushed before the pull, so it can't clobber the server copy.
  const [pulledFor, setPulledFor] = useState<string | null>(null);

  // Pull once per sign-in. The account's saved preferences win; a brand-new account gets this phone's.
  useEffect(() => {
    if (!supabase || !userId || !ready) return;
    let cancelled = false;
    supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('Settings pull failed', error.message);
          return;
        }
        if (data?.settings) {
          const pulled = { ...pick(settings), ...(data.settings as Partial<SyncedSettings>) };
          remote.current = JSON.stringify(pulled);
          update(pulled);
        } else {
          remote.current = ''; // Nothing saved yet: the push effect uploads this phone's settings.
        }
        setPulledFor(userId);
      });
    return () => {
      cancelled = true;
    };
    // Only re-pull when the signed-in user changes, not on every settings edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ready]);

  // Push edits, debounced so stepping the grace period doesn't send a request per tap.
  const synced = JSON.stringify(pick(settings));
  useEffect(() => {
    if (!supabase || !userId || pulledFor !== userId || synced === remote.current) return;
    const timer = setTimeout(async () => {
      const { error } = await supabase!
        .from('user_settings')
        .upsert({ user_id: userId, settings: JSON.parse(synced), updated_at: new Date().toISOString() });
      if (error) console.warn('Settings push failed', error.message);
      else remote.current = synced;
    }, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [userId, pulledFor, synced]);
}

export function CloudSync() {
  useCloudSettings();
  return null;
}
