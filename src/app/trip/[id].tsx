import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GraceStepper } from '@/components/GraceStepper';
import { ModePicker } from '@/components/ModePicker';
import { OriginPicker } from '@/components/OriginPicker';
import { StatusPill } from '@/components/StatusPill';
import { countdownText } from '@/components/TripViews';
import { Button, Card, LinkButton, SectionHeader, SwitchRow, type IconName } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { formatDistance, formatMinutes, formatTime, MODE_ICON, MODE_LABEL, MODE_NOUN, mapsUrl } from '@/lib/format';
import { timingFor } from '@/lib/plan';
import { useSettings, type Settings } from '@/lib/settings';
import { useTrips } from '@/lib/trips';
import { radius, space, type, useTheme } from '@/theme';
import type { Trip } from '@/types';

type OverrideField = 'modeOverrides' | 'graceOverrides' | 'notifyOverrides' | 'originOverrides';

export default function TripScreen() {
  const t = useTheme();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, refreshing } = useTrips();
  const { settings, update } = useSettings();
  const trip = trips.find((x) => x.event.key === id);

  if (!trip) {
    return (
      <View style={[styles.missing, { backgroundColor: t.bg }]}>
        <Stack.Screen options={{ title: 'Trip' }} />
        <Ionicons name="calendar-clear-outline" size={36} color={t.textMuted} />
        <Text style={[type.body, { color: t.textMuted, textAlign: 'center' }]}>
          {refreshing ? 'Updating…' : 'This event has started or is no longer in your upcoming list.'}
        </Text>
      </View>
    );
  }

  const key = trip.event.key;
  // Writes (or with `undefined`, clears) this event's entry in one of the override maps.
  function setOverride<F extends OverrideField>(field: F, value: Settings[F][string] | undefined) {
    const next = { ...settings[field] } as Settings[F];
    if (value === undefined) delete next[key];
    else next[key] = value;
    update({ [field]: next } as Partial<Settings>);
  }

  const timing = timingFor(trip, now);
  const c = t.status[timing.status];
  const { lead, value, aside } = countdownText(trip, timing, settings.leaveTimeStyle);
  const { event, route } = trip;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: event.title }} />

      <View style={[styles.countdown, { backgroundColor: c.bg }]} accessible accessibilityLabel={`${lead} ${value}${aside ? `, ${aside}` : ''}`}>
        <View style={styles.countdownTop}>
          <StatusPill status={timing.status} />
          {aside ? <Text style={[type.caption, { color: c.fg }]}>{aside}</Text> : null}
        </View>
        <Text style={[type.caption, { color: c.fg, marginTop: space.md }]}>{lead}</Text>
        <Text style={[type.display, { color: c.fg }]} adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </Text>
      </View>

      <Card style={{ marginTop: space.lg }}>
        {route ? (
          <Timeline trip={trip} />
        ) : (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Ionicons name="alert-circle-outline" size={20} color={t.status.soon.fg} />
            <Text style={[type.body, { color: t.text, flex: 1 }]}>{trip.error ?? 'No travel estimate yet.'}</Text>
          </View>
        )}
      </Card>

      {event.location ? (
        <View style={{ marginTop: space.lg }}>
          <Button
            icon="navigate"
            label="Open directions"
            onPress={() => Linking.openURL(mapsUrl(event.location!, trip.mode, trip.origin))}
            accessibilityHint="Opens Google Maps with directions to this event"
          />
        </View>
      ) : null}

      <SectionHeader title="Leaving from" aside={trip.origin ? 'Just this event' : 'Default'} />
      <OriginPicker
        value={trip.origin}
        recent={[...new Set(Object.values(settings.originOverrides))].reverse()}
        onChange={(address) => setOverride('originOverrides', address)}
      />

      <SectionHeader title="Getting there by" aside={settings.modeOverrides[key] ? 'Just this event' : 'Default'} />
      <ModePicker value={trip.mode} onChange={(m) => setOverride('modeOverrides', m === settings.defaultMode ? undefined : m)} />

      <SectionHeader title="Arrive early by" aside={settings.graceOverrides[key] != null ? 'Just this event' : 'Default'} />
      <Card>
        <GraceStepper value={trip.graceMin} onChange={(m) => setOverride('graceOverrides', m)} />
        {settings.graceOverrides[key] != null ? (
          <View style={styles.reset}>
            <LinkButton label={`Use default (${settings.graceMin} min)`} onPress={() => setOverride('graceOverrides', undefined)} />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Alerts for this event" aside={settings.notifyOverrides[key] != null ? 'Just this event' : 'Default'} />
      <Card>
        <SwitchRow
          label="Leave alerts"
          helper={alertHelper(trip, settings.headsUpMin, now)}
          value={trip.notify}
          onChange={(on) => setOverride('notifyOverrides', on)}
        />
        {settings.notifyOverrides[key] != null ? (
          <View style={styles.reset}>
            <LinkButton
              label={`Use default (${settings.notifications ? 'on' : 'off'})`}
              onPress={() => setOverride('notifyOverrides', undefined)}
            />
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

function alertHelper(trip: Trip, headsUpMin: number, now: number): string {
  if (!trip.notify) return 'No alerts for this event.';
  if (!trip.route) return 'Alerts start once there’s a travel estimate.';
  const leave = trip.route.leaveBy.getTime();
  if (leave <= now) return 'The leave time has passed, so there are no alerts left to send.';
  const times = [];
  if (headsUpMin > 0 && leave - headsUpMin * 60_000 > now) times.push(formatTime(new Date(leave - headsUpMin * 60_000)));
  times.push(formatTime(trip.route.leaveBy));
  return `Notify me at ${times.join(' and ')}.`;
}

/** Leave → travel → arrive → event starts, as a vertical timeline. */
function Timeline({ trip }: { trip: Trip }) {
  const t = useTheme();
  const route = trip.route!;
  const travelDetail = [formatDistance(route.distanceMeters), route.transitSummary].filter(Boolean).join(' · ');

  const steps: { icon: IconName; time?: string; title: string; detail?: string; strong?: boolean }[] = [
    {
      icon: trip.origin ? 'home-outline' : 'locate-outline',
      time: formatTime(route.leaveBy),
      title: 'Leave',
      detail: trip.origin ?? 'From your current location',
      strong: true,
    },
    {
      icon: MODE_ICON[trip.mode],
      title: `${formatMinutes(route.durationSec / 60)} ${MODE_NOUN[trip.mode]}`,
      detail: travelDetail || MODE_LABEL[trip.mode],
    },
    {
      icon: 'flag-outline',
      time: formatTime(trip.arriveBy),
      title: 'Arrive',
      detail: trip.graceMin ? `${trip.graceMin} min to spare` : 'Right on time',
    },
    { icon: 'calendar-outline', time: formatTime(trip.event.start), title: trip.event.title, detail: trip.event.location ?? undefined },
  ];

  return (
    <View>
      {steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={styles.rail}>
            <View style={[styles.node, { backgroundColor: s.strong ? t.primary : t.primarySoft }]}>
              <Ionicons name={s.icon} size={16} color={s.strong ? t.onPrimary : t.primary} />
            </View>
            {i < steps.length - 1 ? <View style={[styles.line, { backgroundColor: t.border }]} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? space.lg : 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
              <Text style={[s.strong ? type.heading : type.bodyStrong, { color: t.text, flex: 1 }]} numberOfLines={2}>
                {s.title}
              </Text>
              {s.time ? (
                <Text style={[s.strong ? type.heading : type.bodyStrong, { color: s.strong ? t.primary : t.text, fontVariant: ['tabular-nums'] }]}>
                  {s.time}
                </Text>
              ) : null}
            </View>
            {s.detail ? <Text style={[type.caption, { color: t.textMuted }]}>{s.detail}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  countdown: { borderRadius: radius.lg, padding: space.lg, paddingBottom: space.xl },
  countdownTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reset: { alignItems: 'center', marginTop: space.md },
  step: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 32 },
  node: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 2 },
});
