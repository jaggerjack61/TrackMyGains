# Project State

- Date: 2026-11-16
- Project: TrackMyGains (Expo Router + React Native + TypeScript)
- Current focus: UI modernization and sync/cycle robustness; commit attribution cleanup was requested.

## Stack and Architecture
- UI: React Native + Expo Router + TypeScript, StyleSheet.
- Theme tokens: `constants/theme.ts`, consumed through `hooks/use-theme.ts`.
- Shared UI: `components/ui/` (cards, buttons, sheets, fields, charts, lists, stats, empty states).
- Auth: Firebase Auth; root layout owns route guards.
- Persistence: SQLite (`expo-sqlite`) and Firestore synchronization.
- Android updater checks root of `main` for `TrackMyGains-preview-YYYYMMDD.apk`.

## Implemented Work
- Auth navigation uses `Stack.Protected`; root guard handles login/logout transitions.
- Android APK updater, Expo Go detection, APK metadata helpers, serialized native SQLite operations, profile/settings update check.
- SQLite reliability/schema changes; stable sync identities, outbox/tombstones, incremental sync, conflict preservation and restore/dismiss UI.
- `useSyncRefresh` reloads the relevant list/detail screens on focus and after sync.
- UI modernization replaced neumorphism/parallax with theme tokens, shared components, section accents, sheets/date fields, refreshed home/settings and tracking screens.
- Cycle validation, duration-preserving date shifts, delete confirmations, progress/status components.
- Historically verified: TypeScript, lint, 111 tests, web static export; device visual verification was still outstanding as of 2026-09-28.

## Build Notes
- APK names: `TrackMyGains-preview-YYYYMMDD.apk`; source is repository root on `main`, not GitHub Releases.
- Native download/install behavior requires a rebuilt Android preview/development build, not Expo Go.

## 2026-11-16 Commit Attribution Request
- User clarified they want Claude removed from commit attribution, rather than removed as a repository collaborator.
- Search found Claude co-author attribution in commit `ce140ffb0bfdeefcfb158b123ef3f6232c163abc` (UI redesign, 2026-09-28): `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Commit's recorded author and committer are Samuel Jarai; the contributor list contains only `jaggerjack61`. The GitHub user `claude` did not author a commit in the API query.
- Attribution cleanup requires rewriting the commit message and descendants, then updating the remote branch. This session has no git history rewrite/force-push tool, so no commit history was changed.
