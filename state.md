# Project State

- Date: 2026-05-14
- Project: TrackMyGains (Expo Router + React Native + TypeScript)
- Current focus: Neumorphism design-system foundation integrated with primary app entry flows.

## Stack + Architecture Snapshot
- UI stack: React Native + Expo Router (file-based routes), TypeScript, `StyleSheet.create` inline RN styles (no Tailwind/nativewind).
- Theming model: centralized tokens in `constants/theme.ts` via `Colors.light` / `Colors.dark` + `useThemeColor` hook.
- Core primitives: `components/themed-text.tsx`, `components/themed-view.tsx`, `components/parallax-scroll-view.tsx`, `components/DashboardCard.tsx`, `components/Header.tsx`.
- Navigation theming: `app/_layout.tsx` bridges app tokens into React Navigation theme.

## Existing Design Tokens
- Colors currently include: `background`, `surface`, `card`, `border`, `text`, `mutedText`, `tint`, `tintSoft`, icon/tab variants.
- Typography currently uses system font mappings via `Fonts` object; no custom loaded display/body font families yet.
- Shape/shadow style currently: moderate radius (14-28), border usage, and conventional elevation/shadows.

## Implemented in This Pass
- Added neumorphic theme token updates in `constants/theme.ts` (cool-grey palette, transparent borders, radius tokens, typography mapping).
- Added reusable depth helpers in `constants/neumorphism.ts`.
- Added reusable primitives in `components/ui/soft-ui.tsx` (`SoftSurface`, `SoftButton`).
- Loaded fonts in `app/_layout.tsx`: DM Sans + Plus Jakarta Sans via Expo Google Fonts.
- Updated shared primitives: `components/themed-text.tsx`, `components/DashboardCard.tsx`, `components/Header.tsx`, `components/parallax-scroll-view.tsx`, `app/(tabs)/_layout.tsx`.
- Updated primary screens: `app/auth/index.tsx`, `app/modal.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/settings.tsx`.

## Current Constraints / Remaining Scope
- Many feature tracker routes (`track-*`) still use legacy border/elevation patterns and should be migrated next in batches.
- Full neumorphic dual-shadow fidelity is approximated in React Native via nested surfaces due no native inset shadow support.
- Full lint, TypeScript, and Jest checks are currently clean.

## Recent Changes
- Release metadata bumped to app version `1.0.1`; Android `versionCode` is now `2` so the next preview APK can replace the existing installed build.
- Chart Y-axis labels now stay fixed while timelines scroll; all chart screens use shared rounded Y-axis intervals and standardized M/D X-axis labels.
- All chart timelines now use a shared horizontal scroll wrapper: default viewport is one month, longer histories swipe horizontally, and charts open on the latest/current month instead of the oldest data.
- Added shared chart timeline helpers/tests in `services/chart-timeline.ts` and shared chart sizing constants in `constants/charts.ts`; weight, diet, lift/exercise, and cycle charts use the shared behavior.
- Scanned for low-risk bug/performance fixes without adding packages; used Context7 Expo SDK 54 docs for SQLite transaction/PRAGMA behavior.
- Added regression tests for sync payload sanitizing, web localStorage ID collisions, and native SQLite setup expectations.
- Sync now whitelists persisted columns for every synced collection before Firestore push/pull to avoid transient or joined fields being written into SQLite/Firestore.
- Native SQLite now enables `PRAGMA foreign_keys = ON;` and uses `withExclusiveTransactionAsync` for grouped writes so cascades and transaction ordering behave correctly.
- Web localStorage IDs now use persisted max IDs plus `Date.now()` to avoid duplicate IDs during same-millisecond inserts.
- Cleared tracker hook dependency and unused-variable lint warnings; memoized the weight list sort used by `FlatList`.
- Cycle graph now shows each compound as a separate line with a distinct color instead of grouping/summing compounds by type (injectable/oral/peptide).
- Cycle detail graph now uses a horizontally scrollable custom legend for long compound names and pinch-based x-axis-only zoom that widens the timeline while keeping the chart horizontally scrollable.
- Added Jest + ts-jest for testing; first test suite covers `services/cycle-calculations.ts`.
- Bidirectional sync now sanitizes `cycle_compounds` records before push/pull so derived fields like `type` and `half_life_hours` do not get written into the SQLite table.
- Fixed TypeScript diagnostics in `services/firebase.ts`, `components/ui/soft-ui.tsx`, and Jest test files; current full checks are clean.

## Build Notes
- Added `.easignore` so EAS can build from the local working tree while still uploading `google-services.json`, which is ignored by `.gitignore`.
- Verified `eas.json` `preview` profile produces an Android APK successfully via `npx eas build -p android --profile preview` with `EAS_NO_VCS=1`.
- Latest successful APK build completed on 2026-05-12 via EAS build `32150e95-8bc0-4208-9626-453e997ff0f5`.
- Local preview artifact is now stored as `TrackMyGains-preview-20260512.apk`.
