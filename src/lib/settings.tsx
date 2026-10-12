import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { LeaveTimeStyle, TravelMode } from '../types';

export interface Settings {
  /** Minutes early you want to arrive. */
  graceMin: number;
  defaultMode: TravelMode;
  notifications: boolean;
  /** Extra reminder this many minutes before "leave by" (0 = off). */
  headsUpMin: number;
  lookAheadHours: number;
  /** "auto" shows a countdown when departure is close and the clock time when it's further off. */
  leaveTimeStyle: LeaveTimeStyle;
  /** null = all calendars. */
  calendarIds: string[] | null;
  /** Private iCal links (Google "secret address", iCloud share link). Work without a dev build. */
  calendarFeeds: string[];
  /** Read events from the signed-in Google account's calendars (Google Calendar API). */
  googleCalendar: boolean;
  demoMode: boolean;
  /** Per-event overrides, keyed by CalEvent.key. */
  modeOverrides: Record<string, TravelMode>;
  graceOverrides: Record<string, number>;
  /** Per-event alert switch; missing = follow the global `notifications` setting. */
  notifyOverrides: Record<string, boolean>;
  /** Per-event start address; missing = leave from wherever the phone is. */
  originOverrides: Record<string, string>;
}

const DEFAULT_SETTINGS: Settings = {
  graceMin: 10,
  defaultMode: 'drive',
  notifications: true,
  headsUpMin: 10,
  lookAheadHours: 12,
  leaveTimeStyle: 'auto',
  calendarIds: null,
  calendarFeeds: [],
  googleCalendar: false,
  demoMode: false,
  modeOverrides: {},
  graceOverrides: {},
  notifyOverrides: {},
  originOverrides: {},
};

const STORAGE_KEY = 'wtl.settings.v1';

interface SettingsContextValue {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
