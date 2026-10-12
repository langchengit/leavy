import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMinutes, formatTime, MODE_ICON, MODE_NOUN } from '../lib/format';
import { useSettings } from '../lib/settings';
import { timingFor, type TripTiming } from '../lib/plan';
import { radius, space, type, useTheme } from '../theme';
import type { LeaveTimeStyle, Trip } from '../types';
import { StatusPill } from './StatusPill';
import { Card, type IconName } from './ui';

/** In "auto", departures at least this far off show the clock time instead of a countdown. */
const CLOCK_AFTER_MIN = 60;

/**
 * The one line you glance at: "Leave in 23 min" or "Leave at 6:30 PM", then "Now" or "6 min late".
 * `aside` is the other form, shown small beside it.
 */
export function countdownText(trip: Trip, timing: TripTiming, style: LeaveTimeStyle): { lead: string; value: string; aside?: string } {
  const leaveBy = trip.route ? formatTime(trip.route.leaveBy) : null;
  switch (timing.status) {
    case 'relaxed':
    case 'soon': {
      const left = formatMinutes(Math.ceil(timing.minToLeave));
      const clock = style === 'clock' || (style === 'auto' && timing.minToLeave >= CLOCK_AFTER_MIN);
      return clock ? { lead: 'Leave at', value: leaveBy!, aside: `in ${left}` } : { lead: 'Leave in', value: left, aside: `by ${leaveBy}` };
    }
    case 'now':
      return { lead: 'Head out', value: 'Now', aside: `by ${leaveBy}` };
    case 'late':
      return { lead: 'If you leave now', value: `${formatMinutes(Math.ceil(timing.lateByMin))} late`, aside: `by ${leaveBy}` };
    default:
      return { lead: 'Leave by', value: '—' };
  }
}

function tripHref(trip: Trip) {
  return { pathname: '/trip/[id]', params: { id: trip.event.key } } as const;
}

/** Hero card for the next departure. */
export function NextTripCard({ trip, now }: { trip: Trip; now: number }) {
  const t = useTheme();
  const timing = timingFor(trip, now);
  const c = t.status[timing.status];
  const { settings } = useSettings();
  const { lead, value, aside } = countdownText(trip, timing, settings.leaveTimeStyle);
  const { event, route } = trip;

  const a11y = route
    ? `${event.title} at ${formatTime(event.start)}. ${lead} ${value}. Leave by ${formatTime(route.leaveBy)}.`
    : `${event.title} at ${formatTime(event.start)}. ${trip.error ?? 'No travel estimate.'}`;

  return (
    <Link href={tripHref(trip)} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint="Opens trip details">
        {({ pressed }) => (
          <Card style={[styles.hero, pressed && { opacity: 0.9 }]}>
            <View style={[styles.heroTop, { backgroundColor: c.bg }]}>
              <View style={styles.rowBetween}>
                <StatusPill status={timing.status} />
                {aside ? <Text style={[type.caption, { color: c.fg }]}>{aside}</Text> : null}
              </View>
              <Text style={[type.caption, { color: c.fg, marginTop: space.md }]}>{lead}</Text>
              <Text style={[type.display, { color: c.fg }]} adjustsFontSizeToFit numberOfLines={1}>
                {value}
              </Text>
            </View>

            <View style={{ padding: space.lg, gap: space.sm }}>
              <Text style={[type.heading, { color: t.text }]} numberOfLines={2}>
                {event.title}
              </Text>
              <MetaLine icon="time-outline" text={`Starts ${formatTime(event.start)}`} />
              <MetaLine icon="location-outline" text={event.location ?? ''} />
              {route ? (
                <MetaLine
                  icon={MODE_ICON[trip.mode]}
                  text={`${formatMinutes(route.durationSec / 60)} ${MODE_NOUN[trip.mode]} · arrive ${trip.graceMin ? `${trip.graceMin} min early` : 'on time'}`}
                />
              ) : (
                <MetaLine icon="alert-circle-outline" text={trip.error ?? 'No estimate yet'} />
              )}
            </View>
          </Card>
        )}
      </Pressable>
    </Link>
  );
}

function MetaLine({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={16} color={t.textMuted} style={{ marginTop: 3 }} />
      <Text style={[type.body, { color: t.textMuted, flex: 1 }]}>{text}</Text>
    </View>
  );
}

/** Compact row for later trips. */
export function TripRow({ trip, now }: { trip: Trip; now: number }) {
  const t = useTheme();
  const timing = timingFor(trip, now);
  const { event, route } = trip;

  return (
    <Link href={tripHref(trip)} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, starts ${formatTime(event.start)}. ${
          route ? `Leave by ${formatTime(route.leaveBy)}.` : trip.error ?? ''
        }${trip.notify ? '' : ' Alerts off.'}`}
      >
        {({ pressed }) => (
          <View style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }, pressed && { opacity: 0.8 }]}>
            <View style={styles.timeCol}>
              <Text style={[type.overline, { color: t.textMuted }]}>Leave</Text>
              <Text style={[type.bodyStrong, { color: t.text, fontVariant: ['tabular-nums'] }]} numberOfLines={1} adjustsFontSizeToFit>
                {route ? formatTime(route.leaveBy) : '—'}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: t.border }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.bodyStrong, { color: t.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={[type.caption, { color: t.textMuted }]} numberOfLines={1}>
                {formatTime(event.start)} · {event.location}
              </Text>
              <View style={[styles.rowBetween, { marginTop: space.xs }]}>
                <StatusPill status={timing.status} />
                <View style={styles.icons}>
                  {!trip.notify ? <Ionicons name="notifications-off-outline" size={18} color={t.textMuted} /> : null}
                  <Ionicons name={MODE_ICON[trip.mode]} size={18} color={t.textMuted} />
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 0, overflow: 'hidden' },
  heroTop: { padding: space.lg, paddingBottom: space.xl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space.sm,
    minHeight: 64,
  },
  timeCol: { width: 84, alignItems: 'flex-start' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  icons: { flexDirection: 'row', gap: space.sm },
});
