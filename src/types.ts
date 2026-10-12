export type TravelMode = 'drive' | 'transit' | 'walk' | 'bike';

/** How the main leave time reads: "Leave in 25 min", "Leave at 6:30 PM", or switch by distance. */
export type LeaveTimeStyle = 'auto' | 'countdown' | 'clock';

export type TripStatus = 'relaxed' | 'soon' | 'now' | 'late' | 'unknown';

export interface CalEvent {
  /** Unique per occurrence: recurring events share an id, so the start time is folded in. */
  key: string;
  title: string;
  start: Date;
  end: Date;
  location: string | null;
  calendarTitle?: string;
  color?: string;
}

export interface RouteInfo {
  durationSec: number;
  distanceMeters?: number;
  leaveBy: Date;
  /** e.g. "Line 7 → Line 2" for transit trips. */
  transitSummary?: string;
}

export interface Trip {
  event: CalEvent;
  mode: TravelMode;
  graceMin: number;
  /** Event start minus the grace period: when you want to walk in the door. */
  arriveBy: Date;
  /** Whether leave alerts are scheduled for this trip. */
  notify: boolean;
  /** Custom start address for this event; undefined = the phone's current location. */
  origin?: string;
  route?: RouteInfo;
  error?: string;
}
