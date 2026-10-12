import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, type, useTheme } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>;
}

export function SectionHeader({ title, aside }: { title: string; aside?: string }) {
  const t = useTheme();
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Text style={[type.overline, { color: t.textMuted }]}>{title}</Text>
      {aside ? <Text style={[type.caption, { color: t.textMuted }]}>{aside}</Text> : null}
    </View>
  );
}

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  accessibilityHint,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
}) {
  const t = useTheme();
  const primary = variant === 'primary';
  const fg = primary ? t.onPrimary : t.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: t.primary } : { backgroundColor: t.primarySoft },
        pressed && { opacity: 0.8 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Text style={[type.bodyStrong, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primarySoft : t.surface },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[type.caption, styles.chipText, { color: selected ? t.primary : t.text, fontVariant: ['tabular-nums'] }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Banner({
  icon,
  title,
  body,
  action,
  tone = 'info',
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
  tone?: 'info' | 'warn';
}) {
  const t = useTheme();
  const colors = tone === 'warn' ? t.status.soon : { fg: t.primary, bg: t.primarySoft };
  return (
    <View style={[styles.banner, { backgroundColor: colors.bg }]} accessibilityRole="summary">
      <Ionicons name={icon} size={22} color={colors.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyStrong, { color: t.text }]}>{title}</Text>
        {body ? <Text style={[type.caption, { color: t.textMuted }]}>{body}</Text> : null}
        {action ? (
          <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={10} style={{ alignSelf: 'flex-start', paddingVertical: space.xs }}>
            <Text style={[type.bodyStrong, { color: colors.fg }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function SwitchRow({
  label,
  helper,
  value,
  onChange,
  color,
}: {
  label: string;
  helper?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
          <Text style={[type.bodyStrong, { color: t.text, flexShrink: 1 }]}>{label}</Text>
        </View>
        {helper ? <Text style={[type.caption, { color: t.textMuted }]}>{helper}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          tapFeedback();
          onChange(v);
        }}
        accessibilityLabel={label}
        accessibilityHint={helper}
        trackColor={{ true: t.primary, false: t.border }}
        thumbColor={Platform.OS === 'android' ? t.surface : undefined}
        ios_backgroundColor={t.border}
      />
    </View>
  );
}

/** Small text button for secondary actions like "Use default". */
export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={12} style={({ pressed }) => [{ paddingVertical: space.xs }, pressed && { opacity: 0.6 }]}>
      <Text style={[type.bodyStrong, { color: t.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: space.xl,
    marginBottom: space.sm,
    paddingHorizontal: space.xs,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  chip: {
    minHeight: 40,
    minWidth: 52,
    maxWidth: '100%',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    maxWidth: '100%',
  },
  banner: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, marginBottom: space.md },
});
