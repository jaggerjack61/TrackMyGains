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
│  ├─ parallax-scroll-view.tsx
│  ├─ themed-text.tsx
│  └─ themed-view.tsx
├─ hooks/                    # Theme utilities and color scheme
│  ├─ use-color-scheme.ts
│  └─ use-theme-color.ts
├─ services/                 # Data access (SQLite adapters)
│  ├─ database.native.ts
│  └─ database.web.ts
├─ constants/
│  └─ theme.ts               # Centralized light/dark color palette
└─ app.json                  # Expo config
```

## Theming Guide

The app uses a centralized color system in [`constants/theme.ts`](constants/theme.ts). Core tokens include:

- `background`, `surface`, `card`, `text`, `mutedText`, `tint`, `border`

Helpers:

- `ThemedView` automatically applies the theme’s `background`.
- `ThemedText` automatically applies the theme’s `text`.
- `useThemeColor` lets you pull specific tokens inside components.

Tips:

- For full‑screen or section backgrounds, use `ThemedView`.
- For transparent wrappers inside a section (e.g., small layout containers), prefer `View` to avoid unintended grey backgrounds.
- Hero/header areas use `ParallaxScrollView`, which sets a header color and a content container styled like a carded surface.

## Features

- Dashboard landing page with quick‑action cards
- Track weight, workouts, diet, and cycles
- Light/Dark mode with polished shadows and elevation
- Parallax header experience
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
npm run build-apk -- -Profile "production"
```

### Download APK (Polls & Downloads)

Polls an EAS build every 5 minutes and downloads the APK once finished.

```bash
# Basic usage (uses default output path)
npm run download-apk -- -BuildId "<your-build-id>"

# Specify output path
npm run download-apk -- -BuildId "<your-build-id>" -OutputPath ".\releases\TrackMyGains-preview-20260731.apk"

# Change poll interval (default: 5 minutes)
npm run download-apk -- -BuildId "<your-build-id>" -PollIntervalMinutes 2
```

### Full Pipeline (Build + Download)

```powershell
# PowerShell: build then auto-download
$buildId = npm run build-apk --silent
npm run download-apk -- -BuildId $buildId
```

**Note:** Always use `--` before script arguments when running via `npm run` so npm forwards them correctly to the PowerShell scripts.

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
