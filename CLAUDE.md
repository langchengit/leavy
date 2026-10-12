@AGENTS.md

# Leavy

Leavy reads the user's calendar, gets travel times from the Google Routes API, and tells them when to leave. See README.md for what it does and docs/SETUP.md for keys and sign-in.

## Layout

- `src/app/`: Expo Router screens. `(tabs)/` holds Upcoming (`index.tsx`), Connections and Preferences; `trip/[id].tsx` is the trip detail screen; `sign-in.tsx` is the welcome screen.
- `src/lib/`: logic. `trips.tsx` builds trips from events, `plan.ts` decides each trip's status, `routes.ts` calls the Routes API, `settings.tsx` stores preferences, `cloudSync.ts` syncs them to Supabase, `auth.tsx` handles sign-in.
- `src/components/`: shared UI. Use the primitives in `ui.tsx` (Card, Button, Chip, SwitchRow, LinkButton, SectionHeader) and the tokens in `src/theme.ts` instead of new colours or sizes.

## Reviewing pull requests

Flag real problems, most important first. Skip style nitpicks that lint already catches.

- **Secrets:** nothing from `.env.local` in the diff. `EXPO_PUBLIC_*` values are built into the app, so only the Maps key, Supabase URL and publishable key, and Google client IDs belong there. Never a Supabase secret or service-role key.
- **Expo Go and web:** native-only modules (`@react-native-google-signin/google-signin`, and `expo-notifications` on Android) must not be imported at the top level. They throw in Expo Go and break every route that imports them. Follow the lazy `require` pattern in `src/lib/google.ts` and `src/lib/notifications.ts`.
- **Per-event settings:** a new per-event override needs all of: a field in `Settings` and `DEFAULT_SETTINGS` (`settings.tsx`), an entry in `SYNCED` (`cloudSync.ts`), use in `trips.tsx`, and a "Default" / "Just this event" control on the trip screen.
- **Leave-time logic:** changes to `plan.ts`, `routes.ts` or `TripViews.tsx` must keep leave by = event start − grace period − travel time, and the status thresholds (`SOON_MIN`, `CLOCK_AFTER_MIN`) unless the PR is about them.
- **Demo mode:** the app must still work with no keys at all. New features should degrade gracefully when a key or permission is missing.
- **Both themes:** UI colours come from `useTheme()`, never hard-coded, so light and dark mode both work.
- **Accessibility:** tappable elements need an `accessibilityRole` and a label when the visible text isn't enough.
- **Copy:** user-facing text is short and plain. Errors say what went wrong and what to do next.
- **Generated folders:** `android/` and `ios/` are generated. Native changes belong in `app.json` or `app.config.ts`.

Before approving, the change must pass `npm run lint` and `npm run typecheck`.
