# Track My Gains

Cross‑platform fitness tracker built with Expo and React Native. Log workouts, track weight, diet, and cycles — all from a clean, themed dashboard.

- Platforms: Android, iOS, Web
- Router: Expo Router (file‑based)
- Persistence: SQLite (via `expo-sqlite`)
- Syncing: Firebase Firestore
- Theming: Light/Dark with a centralized palette

Repository: https://github.com/jaggerjack61/TrackMyGains

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Start in interactive mode (choose Android/iOS/Web)

```bash
npx expo start
```

Shortcuts:

- Web: `npm run web` (or press `w` in the Expo terminal)
- Android: `npm run android`
- iOS: `npm run ios` (requires macOS with Xcode)

Linting:

```bash
npm run lint
```

## Alternatively

- You can install the apk in the repo directly onto your device

## Project Structure

```
TrackMyGains/
├─ app/
│  ├─ (tabs)/                # Tab navigator
│  │  ├─ index.tsx           # Landing page (cards dashboard)
│  │  └─ settings.tsx        # Settings screen
│  ├─ track-weight/          # Track weight flow
│  ├─ track-diet/            # Track diet flow
│  ├─ track-workouts/        # Routines/workouts/exercises
│  └─ track-cycle/           # Cycles and compounds
├─ components/               # Reusable UI and themed components
│  ├─ DashboardCard.tsx
│  ├─ Header.tsx            # Screen header, avatar, profile sheet
│  ├─ ui/                   # Design-system components
│  ├─ themed-text.tsx
│  └─ themed-view.tsx
├─ hooks/                    # Theme utilities and color scheme
│  ├─ use-color-scheme.ts
│  ├─ use-theme.ts
│  └─ use-theme-color.ts
├─ services/                 # Data access (SQLite adapters)
│  ├─ database.native.ts
│  └─ database.web.ts
├─ constants/
│  └─ theme.ts               # Design tokens (colors, accents, radii, elevation)
└─ app.json                  # Expo config
```

## Theming Guide

Design tokens live in [`constants/theme.ts`](constants/theme.ts):

- `Colors` — semantic light/dark palette (`background`, `card`, `cardMuted`, `border`, `text`, `mutedText`, `subtleText`, `tint`, `onTint`, `danger`, …)
- `Accents` — one identity colour per section: `weight`, `lifts`, `diet`, `cycle`
- `Macros` — protein / carbs / fats colours used by the diet screens
- `Radii`, `Spacing`, `getElevation()` — shape and depth
- `withAlpha()`, `readableTextOn()` — colour helpers

Read them in components with `useTheme()` (returns `{ scheme, colors, accents, macros }`).

Shared UI lives in [`components/ui/`](components/ui/): `Card`, `Button`, `IconButton`, `Fab`, `Sheet` (bottom sheet used for every add/edit form), `TextField`, `DateField`, `SegmentedControl`, `ListRow`, `Stat`, `SectionHeader`, `EmptyState`, `IconBadge`, and `buildLineChartConfig()` for charts. `ThemedText` supports `type` (`title`, `heading`, `display`, `caption`, `overline`, …) and `tone` (`muted`, `subtle`, `tint`, `danger`, …).

Tips:

- Screens start with `ThemedView` + `Header` (large title, optional `eyebrow` tinted with the section accent).
- Pass the section accent (`accents.lifts`, etc.) to `Fab`, `Button color`, charts and icon badges so each area keeps its identity.

## Features

- Home dashboard with a latest weigh-in summary and section cards
- Track weight, workouts, diet, and cycles
- Light/Dark mode with a shared design system
- SQLite persistence via `expo-sqlite`
- Syncing: Firebase Firestore

## Scripts

```bash
npm start          # Expo CLI (interactive)
npm run web        # Start web build on localhost
npm run android    # Start Android (emulator or device)
npm run ios        # Start iOS (simulator; macOS only)
npm run lint       # ESLint checks
npm test           # Run the test suite
npm run typecheck  # TypeScript checks
```

## EAS Build Commands

### Build APK (Returns Build ID)

Starts an EAS Android build and prints the Build ID to stdout.

```bash
# Default: preview profile
npm run build-apk

# Custom profile
npm run build-apk -- --profile "production"
```

### Download APK (Polls & Downloads)

Polls an EAS build every 5 minutes and downloads the APK once finished.

```bash
# Basic usage (uses default output path)
npm run download-apk -- --build-id "<your-build-id>"

# Specify output path
npm run download-apk -- --build-id "<your-build-id>" --output-path "releases/TrackMyGains-preview-20260731.apk"

# Change poll interval (default: 5 minutes)
npm run download-apk -- --build-id "<your-build-id>" --poll-interval-minutes 2
```

### Full Pipeline (Build + Download)

```bash
# Linux and macOS
build_id=$(npm run build-apk --silent)
npm run download-apk -- --build-id "$build_id"
```

```powershell
# Windows PowerShell
$buildId = npm run build-apk --silent
npm run download-apk -- --build-id $buildId
```

The scripts run on Windows, Linux, and macOS with Node.js. Always use `--` before script arguments so npm forwards them correctly.

### APK Naming Convention

Release APKs follow the pattern `TrackMyGains-preview-YYYYMMDD.apk` (e.g., `TrackMyGains-preview-20260523.apk`). The build script writes the same date into `expo.extra.apkVersionDate`, and the download script reuses it for the artifact name. The app's update checker compares that installed-build date with APKs in the root of the `main` branch on GitHub.

## Requirements

- Node.js 20+ and npm
- For Android: Android Studio (emulator) or a device with Expo Go
- For iOS: Xcode (simulator) or a device with Expo Go (macOS)

## Contributing

1. Create a new branch from `main`.
2. Make changes and run `npm run lint`.
3. Open a PR against `main`.

## License

This project currently doesn’t include a license file. If you intend to open‑source it, consider adding an MIT or Apache‑2.0 license.

## Build Configuration

### Android Package Name

The Android package name is configured as `com.jaggerjack61.TrackMyGains`.
**Important:** This must match the package name in `google-services.json` exactly (case-sensitive).

### Dependencies

- **@react-native-async-storage/async-storage**: Uses Expo SDK 54's supported `2.2.0` release.
- **Dependency checks**: `npx expo install --check`, Expo Doctor, and `npm audit` should all pass cleanly.
