# Project State

- Date: 2026-07-31
- Project: TrackMyGains (Expo Router + React Native + TypeScript)
- Current focus: Sync correctness/performance and cycle calculation robustness

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
- Added downloaded-APK metadata helpers in all database layers.
- Native SQLite helper operations are serialized through a queue to avoid overlapping update-check and sync queries releasing shared native statement handles.
- Pure APK update helpers in `services/app-update-metadata.ts`: filename regex, date parsing, latest selection, GitHub API response parsing.
- `services/app-updates.ts`: startup/manual update check prompts before downloading, uses Android DownloadManager via `react-native-blob-util`, then prompts again before launching the APK installer via `expo-intent-launcher`.
- APK updater now detects Expo Go (`ExecutionEnvironment.StoreClient`) before native updater imports; startup is quiet there and manual checks report that a preview/development build is required.
- ProfileMenu gains "Check for Updates" button (Android only, hidden on other platforms).
- Added `expo-notifications`, `expo-intent-launcher`, and `react-native-blob-util`; `app.json` has install and notification permissions.
- All 100 service tests pass; lint, `tsc --noEmit`, Expo Doctor, dependency checks, and Android/web bundle exports are clean.

## Build Notes
- APK naming convention: `TrackMyGains-preview-YYYYMMDD.apk` in repo root.
- The update source is the repo root on `main`, not GitHub Releases.
- Requires a rebuilt APK to validate DownloadManager/install intents (cannot test in Expo Go).

## 2026-07-10 Reliability Pass
- Cycle level calculation now uses a linear recurrence and rejects non-integer dosing periods, preventing fractional-period render freezes.
- Sync snapshots use fixed-count all-table reads instead of hierarchical N+1 database traversal.
- Firestore collections are fetched concurrently; any failed read aborts reconciliation instead of being treated as an empty collection.
- Auto-sync polling pauses while the app is inactive.
- Native initialization waits for in-flight schema setup, uses schema-aware migrations, adds hot-query indexes, and uses one-statement SQLite upserts.
- Web records now receive sync timestamps, support bulk pull upserts, and cascade routine/workout deletion through exercise logs.
- Platform-specific compound reference IDs are not synced; pulled cycle compounds resolve references by compound name.

## 2026-07-31 Sync and Performance Pass
- Synced records use stable device-independent IDs and stable parent references instead of local SQLite IDs.
- Deletions propagate through retained tombstones, including descendant records created concurrently beneath a deleted parent.
- Local outbox entries drive incremental sync and are cleared conditionally so a newer edit cannot be discarded by an older in-flight sync.
- Auto-sync runs every five minutes while active and reads Firestore changes by cursor instead of scanning every collection every minute.
- Diet dates use local calendar keys, one log is enforced per diet/day, history refreshes on focus, and nutrition totals use one aggregate query.
- The updater compares remote APKs with the installed build date and can reinstall an already-downloaded pending update without downloading it again.
- Expo dependencies are aligned, AsyncStorage uses the supported SDK version, and transitive security patches leave `npm audit` at zero findings.
- Font and icon imports use direct subpaths, reducing the Android export from 75 bundled assets to 32.

## 2026-08-03 Audit Findings (investigation only, no fixes applied)
- Data loss risk: on sync conflict, remote wins when its client timestamp is >= local (equal-time tie-break is deliberate, codified in sync-reconciliation.test.ts); pull overwrites the pending outbox edit and deletes its outbox row; no backup of the losing edit, winner decided by device clock (CURRENT_TIMESTAMP).
- Stale screens: mount-only load (no catch) on track-weight, all track-workouts/*, track-diet/index list, and meal-day route; only track-diet/[dietId] history + track-cycle use useFocusEffect. No sync-completion event exists (firebase.ts emits none), so even useFocusEffect screens stay stale while focused. initDatabase self-resets (db=null, initPromise=null) so failures retry on remount, not permanent.
- Critical modules firebase.ts/database.native.ts have only source-text tests (*-source.test.ts readFileSync + not.toContain), no behavioral coverage.
- Minor: APK updater lacks status/size/hash verification; UTC-instant vs local-date-key mixing; unthrottled LIKE query on meal name input; hardcoded colors bypass theme; expo-linking/expo-system-ui unused direct deps; builds.json orphaned.

## 2026-08-03 Conflict & Staleness Fix Pass
- Sync conflicts now preserve the losing local edit: `reconcileCollection` returns `conflictLosers`, and `bulkInsertOrUpdate` (native + web) writes them to a new local-only `sync_conflicts` table before the remote pull overwrites them. Deterministic LWW tie-break unchanged.
- Added `services/sync-events.ts` — `bidirectionalSync` notifies subscribers on success; new `useSyncRefresh` hook reloads screen data on focus AND on sync completion (with unhandled-rejection guard).
- All 10 list/detail screens (track-weight, track-workouts/*, track-diet/*, track-cycle/*) now use `useSyncRefresh` instead of mount-only `useEffect` or bare `useFocusEffect`.
- New behavioral tests: conflictLosers reporting in sync-reconciliation.test.ts; loser preservation via bulkInsertOrUpdate in database.web.test.ts. 109 tests pass; lint + tsc clean.

## 2026-08-03 Sync Conflicts UI Pass
- Settings now shows a "Sync Conflicts" section when conflicts exist (count badge, collection label, lost-at time, sync id, payload summary). Each conflict offers Restore (brings back the losing edit, bumps last_modified so it wins the next sync, re-queues outbox via sync triggers/saveArray, clears stale tombstone/delete markers) and Dismiss (removes the preserved copy only).
- New DB APIs: `restoreSyncConflict` (native + web, returns false on FK failure e.g. deleted parent) and `deleteSyncConflict`; both declared in database.d.ts.
- Settings uses `useSyncRefresh` so the list appears/updates after any sync completes.
- New web tests: restore re-queues upsert + bumps timestamp; dismiss leaves the winning record untouched. 111 tests pass; lint + tsc clean.
