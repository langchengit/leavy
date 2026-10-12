@AGENTS.md

# Leavy

Leavy reads the user's calendar, gets travel times from the Google Routes API, and tells them when to leave. See README.md for what it does and docs/SETUP.md for keys and sign-in.

## Layout

- `src/app/`: Expo Router screens. `(tabs)/` holds Upcoming (`index.tsx`), Connections and Preferences; `trip/[id].tsx` is the trip detail screen; `sign-in.tsx` is the welcome screen.
- `src/lib/`: logic. `trips.tsx` builds trips from events, `plan.ts` decides each trip's status, `routes.ts` calls the Routes API, `settings.tsx` stores preferences, `cloudSync.ts` syncs them to Supabase, `auth.tsx` handles sign-in.
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

Check these five things on every PR, in this order. Point to the file and line for each problem, and say what would go wrong for the user.

### 1. Does the code match the PR description?

- Read the PR title and description first, then check that the diff actually does what they say. Flag anything described but missing, and anything that is done only partly (for example, added to Settings but never used).
- Flag changes that the description doesn't mention, especially behaviour changes, new dependencies, changed defaults, or deleted code. Unrelated changes belong in a separate PR.
- If the PR says it fixes a bug, check that the change addresses the cause and not only the symptom, and that the same bug can't still happen through another path.
- If the description is empty or too vague to check against, say so.

### 2. Is the new logic correct?

- Trace each new or changed value through "How the app works" above, from where it's set to where it's shown. Flag any step that ignores it, uses the wrong one, or uses a stale copy.
- Check edge cases: no events, no location on an event, no route or a route error, no location permission, demo mode, signed out vs. signed in, an event that has already started, a leave time in the past, times around midnight, and recurring events (keys include the start time).
- Check units and time maths: minutes vs. seconds vs. milliseconds, `Date` vs. timestamps, and that `now` comes from the caller instead of `Date.now()` inside pure functions.
- Async code: promises are awaited or deliberately not awaited, errors are caught where the UI expects a value, and state isn't set after a newer refresh has replaced it.
- React: hooks aren't called conditionally, effect dependencies are complete, and context values that change on every render aren't passed down unnecessarily.

### 3. Is a new feature complete?

- **New setting:** a field and doc comment in `Settings`, a default in `DEFAULT_SETTINGS`, an entry in `SYNCED` if it should follow the account, and a control in Preferences or Connections.
- **New per-event override:** all of the above, plus use in `trips.tsx` and a "Default" / "Just this event" control with a reset on the trip screen.
- **New screen:** placed under `src/app/`, reachable from the UI, works in both themes, and handles loading, empty and error states.
- **New dependency:** added with `npx expo install`. If it has native code, the app still loads in Expo Go (lazy `require` behind a check, like `google.ts` and `notifications.ts`), and README notes the development build requirement.
- **User-visible change:** README updated if it changes how to run, set up or use the app.

### 4. Does it break anything that already worked?

- For every changed function, type or prop, find all its callers (search the repo) and check that each one still gets what it expects. Flag changed signatures, return shapes, or defaults that a caller wasn't updated for.
- Check each item in "Behaviour that must keep working" that the changed files touch.
- Flag removed or renamed settings keys: saved settings and Supabase rows still contain the old key, so they need a migration or a fallback.
- Flag changes to `routes.ts` request fields, since the Routes API rejects unknown or misnamed fields at runtime, not at compile time.

### 5. Does the new code actually work?

Don't stop at "looks right". Show that it works, or say exactly what's unproven.

- Walk through the main scenario the PR describes with concrete values, step by step through the changed code. Example: an event at 3:00 PM, a 10 min grace period and a 25 min drive should give a leave time of 2:25 PM. Flag any step where the actual result differs from the expected one.
- Do the same for at least one edge case from section 2 that the change could plausibly hit.
- Check that new code is actually reached: a new function is called, a new component is rendered, a new setting is read somewhere, and a new branch's condition can be true.
- The PR description must say how the change was tested (Expo Go, development build, emulator, device or web) and what was checked. For UI changes, it should include a screenshot. If it doesn't, ask for it.
- If the repo has tests (`npm test`), new logic in `src/lib/` should come with tests for the main case and the edge cases, and the tests must check the result, not just that the code runs.
- If something can only be verified on a device (sign-in, notifications, calendar access, real routes), list it as "needs testing on a device" instead of assuming it works.

### Always check

- **Secrets:** nothing from `.env.local` in the diff. `EXPO_PUBLIC_*` values are built into the app, so only the Maps key, Supabase URL and publishable key, and Google client IDs belong there. Never a Supabase secret or service-role key.
- **Expo Go and web:** native-only modules (`@react-native-google-signin/google-signin`, and `expo-notifications` on Android) are never imported at the top level. They throw in Expo Go and break every route that imports them.
- **Both themes:** colours come from `useTheme()`, never hard-coded.
- **Accessibility:** tappable elements have an `accessibilityRole`, and a label when the visible text isn't enough.
- **Copy:** user-facing text is short and plain. Errors say what went wrong and what to do next.
- **Generated folders:** `android/` and `ios/` are never edited; native changes go in `app.json` or `app.config.ts`.

Skip style nitpicks that lint already catches. The change must pass `npm run lint` and `npm run typecheck`.
