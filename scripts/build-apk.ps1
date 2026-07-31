<#
.SYNOPSIS
    Starts an Expo EAS Android build and returns the Build ID.

.DESCRIPTION
    Reusable script that triggers an EAS Android build (APK), captures the CLI output,
    extracts the Build UUID, and prints it so it can be piped or captured by callers.

.PARAMETER Profile
    The EAS build profile to use (from eas.json). Default: preview.

.PARAMETER Platform
    The platform to build for. Default: android.

.PARAMETER VersionDate
    The YYYYMMDD value baked into the app for update comparisons. Defaults to today.

.EXAMPLE
    .\scripts\build-apk.ps1
    # Returns the build ID after starting a preview Android build.

.EXAMPLE
    .\scripts\build-apk.ps1 -Profile "production"
    # Uses the production profile instead of preview.

.EXAMPLE
    $buildId = .\scripts\build-apk.ps1
    .\scripts\download-eas-apk.ps1 -BuildId $buildId
#>
param(
    [Parameter(Mandatory = $false)]
    [string]$Profile = "preview",

    [Parameter(Mandatory = $false)]
    [string]$Platform = "android",

    [Parameter(Mandatory = $false)]
    [string]$VersionDate = (Get-Date -Format "yyyyMMdd")
)

$ErrorActionPreference = "Stop"

if ($VersionDate -notmatch '^\d{8}$') {
    throw "VersionDate must use YYYYMMDD format."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$appJsonPath = Join-Path $repoRoot "app.json"
$updateAppConfigScript = @'
const fs = require("node:fs");

const [appJsonPath, versionDate] = process.argv.slice(1);
const rawConfig = fs.readFileSync(appJsonPath, "utf8").replace(/^\uFEFF/, "");
const appConfig = JSON.parse(rawConfig);

appConfig.expo.extra ??= {};
appConfig.expo.extra.apkVersionDate = versionDate;
fs.writeFileSync(appJsonPath, `${JSON.stringify(appConfig, null, 2)}\n`, "utf8");
'@

& node -e $updateAppConfigScript $appJsonPath $VersionDate
if ($LASTEXITCODE -ne 0) {
    throw "Could not update apkVersionDate in app.json."
}

Write-Host "Starting EAS build (profile: $Profile, platform: $Platform, version date: $VersionDate)..." -ForegroundColor Cyan

# Run the build command and capture all output (stdout + stderr)
$output = & npx eas-cli build --platform $Platform --profile $Profile --non-interactive --no-wait 2>&1
$outputString = $output -join "`n"

# Regex for a standard UUID v4
$uuidPattern = '\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b'

# 1st attempt: look for the expo.dev builds URL pattern which is the most reliable
$urlPattern = 'https://expo\.dev/.+/builds/(' + $uuidPattern.TrimStart('\b').TrimEnd('\b') + ')'
$match = [regex]::Match($outputString, $urlPattern)

if ($match.Success) {
    $buildId = $match.Groups[1].Value
    Write-Output $buildId
    exit 0
}

# 2nd attempt: find any UUID-like string in the output (last match is usually the build ID)
$matches = [regex]::Matches($outputString, $uuidPattern)
if ($matches.Count -gt 0) {
    $buildId = $matches[$matches.Count - 1].Groups[1].Value
    Write-Output $buildId
    exit 0
}

# If nothing matched, dump the raw output so the user can debug
Write-Host "--- EAS CLI raw output ---" -ForegroundColor Yellow
Write-Host $outputString
Write-Host "--------------------------" -ForegroundColor Yellow

throw "Could not extract build ID from EAS build output."
