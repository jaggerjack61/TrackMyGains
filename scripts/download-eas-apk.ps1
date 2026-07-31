<#
.SYNOPSIS
    Polls an Expo EAS build and downloads the APK artifact once complete.

.DESCRIPTION
    Reusable script that monitors an EAS Android build by ID, waits until it finishes,
    downloads the APK, and optionally replaces a local artifact.

.PARAMETER BuildId
    The EAS build UUID (e.g. c6ce723e-47c1-4736-942e-dccc5686f7e3).

.PARAMETER OutputPath
    Full or relative path where the APK should be saved.
    Defaults to a dated filename using the version baked into app.json.

.PARAMETER PollIntervalMinutes
    How often to check the build status. Default: 5.

.EXAMPLE
    .\scripts\download-eas-apk.ps1 -BuildId "c6ce723e-47c1-4736-942e-dccc5686f7e3"

.EXAMPLE
    .\scripts\download-eas-apk.ps1 -BuildId "abc-123" -OutputPath "..\releases\myapp.apk" -PollIntervalMinutes 2
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$BuildId,

    [Parameter(Mandatory = $false)]
    [string]$OutputPath,

    [Parameter(Mandatory = $false)]
    [int]$PollIntervalMinutes = 5
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $appJsonPath = Join-Path $repoRoot "app.json"
    $appConfig = Get-Content -LiteralPath $appJsonPath -Raw | ConvertFrom-Json
    $versionDate = $appConfig.expo.extra.apkVersionDate
    if ($versionDate -notmatch '^\d{8}$') {
        throw "app.json expo.extra.apkVersionDate must use YYYYMMDD format."
    }
    $OutputPath = ".\TrackMyGains-preview-$versionDate.apk"
}

function Get-EasBuildStatus($id) {
    try {
        # EAS writes its progress spinner to stderr even when --json is used.
        # With ErrorActionPreference=Stop, Windows PowerShell promotes that
        # harmless output to a terminating NativeCommandError.
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = & npx eas-cli build:view $id --json 2>$null
            $exitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        if ($exitCode -ne 0) {
            throw "eas-cli exited with code $exitCode."
        }

        $text = $output -join "`n"
        if ([string]::IsNullOrWhiteSpace($text)) {
            Write-Host "No output from eas-cli" -ForegroundColor Red
            return $null
        }
        return $text | ConvertFrom-Json
    } catch {
        Write-Host "Failed to query build status: $_" -ForegroundColor Red
        return $null
    }
}

function Invoke-ApkDownload($url, $destination) {
    $parent = Split-Path -Parent $destination
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    Write-Host "Downloading APK to $destination ..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
    Write-Host "Saved: $destination" -ForegroundColor Green
}

# Resolve output path relative to script location if not absolute
if (-not ([System.IO.Path]::IsPathRooted($OutputPath))) {
    $OutputPath = Join-Path $repoRoot $OutputPath
}

Write-Host "Polling EAS build $BuildId every $PollIntervalMinutes minute(s)..." -ForegroundColor Yellow
Write-Host "Output will be saved to: $OutputPath" -ForegroundColor Yellow

$terminalStates = @("FINISHED", "ERRORED", "CANCELED")

while ($true) {
    $build = Get-EasBuildStatus $BuildId

    if (-not $build) {
        Write-Host "Retrying in $PollIntervalMinutes minute(s)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds ($PollIntervalMinutes * 60)
        continue
    }

    $status = $build.status
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Build status: $status" -ForegroundColor White

    if ($status -eq "FINISHED") {
        if (-not $build.artifacts -or -not $build.artifacts.buildUrl) {
            Write-Host "Build finished but no artifact URL found. Exiting." -ForegroundColor Red
            exit 1
        }

        $url = $build.artifacts.buildUrl
        Invoke-ApkDownload $url $OutputPath
        Write-Host "Done." -ForegroundColor Green
        exit 0
    }

    if ($terminalStates -contains $status) {
        Write-Host "Build ended with status '$status'. No APK to download." -ForegroundColor Red
        exit 1
    }

    Write-Host "Still in progress. Waiting $PollIntervalMinutes minute(s)..." -ForegroundColor DarkGray
    Start-Sleep -Seconds ($PollIntervalMinutes * 60)
}
