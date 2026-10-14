import type { TravelMode } from '../types';
import { getLocales } from 'expo-localization';

const IMPERIAL_REGIONS = new Set(['US', 'GB']);

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

/** 95 → "1 h 35 min", 20 → "20 min". */
export function formatMinutes(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function formatDistance(meters?: number, regionCode = getLocales()[0]?.regionCode): string | null {
  if (meters == null) return null;
  if (regionCode && IMPERIAL_REGIONS.has(regionCode)) {
    const miles = meters / 1609.344;
    return miles < 0.1 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
  }
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export const MODE_LABEL: Record<TravelMode, string> = {
  drive: 'Drive',
  transit: 'Transit',
  walk: 'Walk',
  bike: 'Bike',
};

export const MODE_NOUN: Record<TravelMode, string> = {
  drive: 'drive',
  transit: 'transit ride',
  walk: 'walk',
  bike: 'bike ride',
};

export const MODE_ICON = {
  drive: 'car-outline',
  transit: 'bus-outline',
  walk: 'walk-outline',
  bike: 'bicycle-outline',
} as const satisfies Record<TravelMode, string>;

const GMAPS_MODE: Record<TravelMode, string> = {
  drive: 'driving',
  transit: 'transit',
  walk: 'walking',
  bike: 'bicycling',
};

/** Without an origin, Google Maps starts from the phone's current location. */
export function mapsUrl(destination: string, mode: TravelMode, origin?: string): string {
  const q = new URLSearchParams({ api: '1', destination, travelmode: GMAPS_MODE[mode], ...(origin ? { origin } : {}) });
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}
