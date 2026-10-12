@AGENTS.md

# Leavy

Leavy reads the user's calendar, gets travel times from the Google Routes API, and tells them when to leave. See README.md for what it does and docs/SETUP.md for keys and sign-in.

## Layout

- `src/app/`: Expo Router screens. `(tabs)/` holds Upcoming (`index.tsx`), Connections and Preferences; `trip/[id].tsx` is the trip detail screen; `sign-in.tsx` is the welcome screen.
- `src/lib/`: logic. `trips.tsx` builds trips from events, `plan.ts` decides each trip's status, `routes.ts` calls the Routes API, `settings.tsx` stores preferences, `cloudSync.ts` syncs them to Supabase, `auth.tsx` handles sign-in.
- `src/lib/*.test.ts`: Jest unit tests (`format.test.ts`, `plan.test.ts`), run with `npm test` (`jest-expo` preset). Keep them next to the code they test.
- `src/components/`: shared UI. Use the primitives in `ui.tsx` (Card, Button, Chip, SwitchRow, LinkButton, SectionHeader) and the tokens in `src/theme.ts` instead of new colours or sizes.

## How the app works

Trace changes through this flow. A change in one step usually needs matching changes in the steps after it.

1. **Start-up and sign-in:** `_layout.tsx` waits for `AuthProvider` (`auth.tsx`) to be `ready`. If there's no account and the user hasn't chosen guest mode, `Stack.Protected` shows `sign-in.tsx`; otherwise the tabs. "Continue as guest" sets `leavy.guest` in AsyncStorage, and `signOut()` clears it.
2. **Settings:** `SettingsProvider` (`settings.tsx`) loads from AsyncStorage, merging with `DEFAULT_SETTINGS`, so old saved settings without a new field still work. `CloudSync` (`cloudSync.ts`) pulls the `SYNCED` keys once per sign-in, then pushes changes after a short delay.
3. **Events:** `refresh()` in `trips.tsx` collects events from the phone's calendars (`calendar.ts`), calendar links (`icsFeed.ts`) and Google Calendar (`googleCalendar.ts`). It removes duplicates, and keeps events that start between now and `lookAheadHours` ahead. With no real source, or with `demoMode` on, it uses `demo.ts`.
4. **Trips:** for each event with a location, `trips.tsx` applies the per-event overrides (mode, grace, alerts, start address), works out `arriveBy = start − grace`, and calls `getRoute()` (`routes.ts`) from the start address or the phone's location. Demo mode uses `demoRoute()` instead. Errors become `trip.error` and never throw out of `refresh()`.
5. **Status and display:** `timingFor()` (`plan.ts`) turns a trip and the current time into a status. `countdownText()` (`TripViews.tsx`) turns that into the text shown, using `leaveTimeStyle`.
6. **Alerts:** after each refresh, `syncLeaveAlerts()` (`notifications.ts`) cancels Leavy's scheduled notifications and schedules new ones for trips with alerts on.
7. **Refreshing:** `refresh()` runs when settings change, every 5 minutes while the app is open, when it returns to the foreground, and on pull to refresh. A newer refresh overrides an older one through `runId`.

## Behaviour that must keep working

Any PR that touches the files involved must leave all of these working. Flag a PR that breaks one, even by accident.

- A fresh install opens the sign-in screen. **Continue as guest** opens Upcoming. **Back to the welcome screen** (Connections → Account) returns a guest to sign-in.
- With **no keys at all** (empty `.env.local`), the app runs in demo mode with sample events, travel times and statuses, and nothing throws.
- The app runs in **Expo Go** on iPhone and Android, and on web. Sign-in buttons are hidden there, not broken.
- **Leave time** = event start − grace period − travel time. For transit, the leave time is the departure of the first ride minus the walk to the stop.
- **Status thresholds:** On track above `SOON_MIN` (15 min) before leaving; Leave soon from 15 to 0 min; Leave now once the leave time has passed but you'd still arrive on time; Running late when you'd arrive 1 min or more after the start. In Auto mode, the clock time shows from `CLOCK_AFTER_MIN` (60 min) out.
- **Per-event overrides** (mode, grace, alerts, start address) apply only to their event, show "Just this event" on the trip screen, and can be reset to the default.
- **Settings** persist across app restarts and, when signed in, sync to Supabase without overwriting the account's saved values on first sign-in.
- **Alerts** are only scheduled for future leave times, and never twice for the same trip.
- **Location:** if a fresh position isn't available, the last known one is used. "Turn on location" appears only when permission is actually denied.
- **Google Calendar:** parallel calendar fetches share one token request (`googleAccessToken()`), and an expired token is refreshed once on a 401.

## Reviewing pull requests

Be a helpful second pair of eyes, not a gatekeeper. Contributors are often new, so keep the tone friendly and the review short.

### Two kinds of feedback

- **Problems:** only when you can show the code is broken or the logic is wrong. Give the file and line, the concrete input or steps (for example, "an event at 3:00 PM with a 10 min grace period and a 25 min drive gives 2:35 PM instead of 2:25 PM"), and what goes wrong for the user. Breaking an item in "Behaviour that must keep working" counts as a problem.
- **Suggestions:** everything else. Phrase them as optional ideas ("You could…", "Consider…"), and never as something the contributor must do before merging.

If you can't show that something is broken, it's a suggestion, or leave it out. If there are no problems, say so plainly at the top.

### What counts as a problem

- The code crashes, throws, or shows wrong results for a realistic input, including the edge cases below.
- The logic doesn't do what the PR description says it does.
- It breaks something that already worked: a caller that wasn't updated for a changed function, a renamed settings key that loses saved settings, or an item in "Behaviour that must keep working".
- It imports a native-only module (`@react-native-google-signin/google-signin`, or `expo-notifications` on Android) at the top level, which crashes the app in Expo Go.
- It exposes a secret: anything from `.env.local`, or a Supabase secret or service-role key.

### Where to look

Trace new values through "How the app works", and try the edge cases that apply: no events, an event without a location, a route error, no location permission, demo mode, signed in or out, an event that has already started, a leave time in the past, times around midnight, and recurring events. Watch for unit mix-ups (minutes, seconds, milliseconds), unhandled promise errors, and state set after a newer refresh has replaced it.

### Good suggestions (optional)

Mention these only when they'd clearly help, and keep each to a sentence or two:

- Tests for new logic in `src/lib/`, if the repo has `npm test`.
- A note in the PR on how it was tested, or a screenshot for a UI change.
- A small simplification, or reusing an existing helper or UI primitive from `ui.tsx`.
- For a new setting or per-event override, the usual pieces: `Settings` and `DEFAULT_SETTINGS`, `SYNCED` in `cloudSync.ts`, a control in Preferences, Connections or the trip screen.
- Colours from `useTheme()` so dark mode works, and an `accessibilityRole` or label on new tappable elements.
- Plain, short wording in user-facing text, or a README update if the change affects setup.

Don't comment on style that lint already catches. Lint and typecheck run in CI.
