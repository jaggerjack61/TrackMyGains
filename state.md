# Project State

- Date: 2026-05-23
- Project: TrackMyGains (Expo Router + React Native + TypeScript)
- Current focus: Auth routing fix, Android APK self-update support

## Stack + Architecture Snapshot
- UI: React Native + Expo Router, TypeScript, StyleSheet (no Tailwind)
- Theming: centralized tokens in `constants/theme.ts`
- Auth: Firebase Auth, root layout owns the auth state guard
- Persistence: SQLite via `expo-sqlite` + Firestore sync
- Updater: Android-only, checks `main` branch root for `TrackMyGains-preview-YYYYMMDD.apk`

## Implemented in This Pass
- Root layout now uses Expo Router `Stack.Protected` guards, removing `initialRouteName` and `unstable_settings.anchor` so authenticated routes cannot leave login beneath the dashboard.
- Root protected routes use concrete Expo Router screen names for leaf routes (`track-diet/index`, `track-weight/index`, `track-workouts/index`, etc.) to avoid layout-child warnings.
- Auth screen no longer subscribes to `onAuthStateChanged` or imperatively `router.replace`; the root guard handles all auth→app transitions.
- Tab screens (`index`, `settings`) no longer call `router.replace("/auth")` on logout; root guard routes to auth after `signOut`.
- Added local-only `apks` table in SQLite with `version_date` column (not synced to Firestore).
- Added `getApkVersionDate()` / `setApkVersionDate()` helpers in all database layers.
- Native SQLite helper operations are serialized through a queue to avoid overlapping update-check and sync queries releasing shared native statement handles.
- Pure APK update helpers in `services/app-update-metadata.ts`: filename regex, date parsing, latest selection, GitHub API response parsing.
- `services/app-updates.ts`: fire-and-forget startup auto-download, manual check, Android DownloadManager download via `react-native-blob-util`, update-found local notification, content URI installer launch via `expo-intent-launcher`.
- APK updater now detects Expo Go (`ExecutionEnvironment.StoreClient`) before native updater imports; startup is quiet there and manual checks report that a preview/development build is required.
- ProfileMenu gains "Check for Updates" button (Android only, hidden on other platforms).
- Added `expo-notifications`, `expo-intent-launcher`, `expo-application`, and `react-native-blob-util`; `app.json` has install and notification permissions.
- All 60 service tests pass; lint, `tsc --noEmit`, and Android bundle export are clean.

## Build Notes
- APK naming convention: `TrackMyGains-preview-YYYYMMDD.apk` in repo root.
- The update source is the repo root on `main`, not GitHub Releases.
- Requires a rebuilt APK to validate DownloadManager/install intents (cannot test in Expo Go).
