# Project State — TrackMyGains

_Last updated: 2026-02-20_

## Summary
- App type: Expo + React Native + TypeScript (Expo Router)
- Platforms: Android / iOS / Web
- Auth: Firebase Authentication (email/password)
- Sync: Bidirectional sync with Firestore
- Local persistence:
  - Native: SQLite (`expo-sqlite`)
  - Web: `localStorage` adapter

## Runtime & Tooling
- Expo SDK: `~54.0.33`
- React Native: `0.81.5`
- React: `19.1.0`
- Router: `expo-router ~6.0.23`
- TypeScript: `~5.9.2` (strict mode enabled)
- Lint: `expo lint`

## Navigation State
### Root
- `app/_layout.tsx`
  - Chooses initial route from auth state
  - Runs initial sync on login
  - Starts/stops auto-sync with app lifecycle

### Auth
- `app/auth/index.tsx`
  - Login/register flow with Firebase Auth
  - Redirects authenticated users to `/(tabs)`

### Tabs
- `app/(tabs)/index.tsx`
  - Dashboard with entry cards:
    - Track Weight
    - Track Workouts
    - Track Diet
    - Track Cycle
  - Profile menu + manual sync + logout
- `app/(tabs)/settings.tsx`
  - Data management:
    - Export database
    - Import database
  - Profile menu + manual sync + logout

### Feature Routes
- Weight: `app/track-weight/index.tsx`
- Workouts:
  - `app/track-workouts/index.tsx`
  - `app/track-workouts/[routineId]/index.tsx`
  - `app/track-workouts/[routineId]/[workoutId]/index.tsx`
  - `app/track-workouts/[routineId]/[workoutId]/[exerciseId]/index.tsx`
- Diet:
  - `app/track-diet/index.tsx`
  - `app/track-diet/[dietId]/index.tsx`
  - `app/track-diet/[dietId]/[date]/index.tsx`
- Cycle:
  - `app/track-cycle/index.tsx`
  - `app/track-cycle/add.tsx`
  - `app/track-cycle/[cycleId]/index.tsx`
  - `app/track-cycle/[cycleId]/add-compound.tsx`

## Data Model State
Core entities found in database layer:
- `weights`
- `routines`, `workouts`, `exercises`, `exercise_logs`
- `diets`, `daily_logs`, `meals`
- `cycles`, `compounds`, `cycle_compounds`
- `sync_metadata`

Notable behavior:
- Compound reference data is preloaded on native DB init if missing.
- Ordering fields exist for routines/workouts/diets (`sort_order`).
- Sync layer supports push + pull and basic conflict-safe merge semantics.

## Theming/UI State
- Centralized token palette in `constants/theme.ts`
- Shared themed components (`ThemedText`, `ThemedView`, etc.)
- Parallax-style dashboard/settings headers in tabs

## Config State
- Package name: `com.jaggerjack61.TrackMyGains`
- Typed routes: enabled
- React Compiler experiment: enabled
- New architecture: enabled

## Observations / Follow-ups
- A top-level `backup/` folder exists and appears non-routed in current app tree.
- Firebase config is directly defined in `services/firebase.ts` (works, but may be moved to env-based config later if desired).
- README and code are broadly aligned with current implementation.
