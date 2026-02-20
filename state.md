# Project State

- Date: 2026-02-20
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
- Lint currently reports pre-existing warnings in untouched tracker screens (no new errors introduced).
