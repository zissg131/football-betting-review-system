$ErrorActionPreference = "SilentlyContinue"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnsureScript = Join-Path $ProjectRoot "scripts\ensure-dev-server.ps1"
$mutex = New-Object System.Threading.Mutex($false, "FootballEdgeTrackerDevServerWatch")

if (-not $mutex.WaitOne(0)) {
  exit 0
}

try {
  while ($true) {
    powershell -NoProfile -ExecutionPolicy Bypass -File $EnsureScript | Out-Null
    Start-Sleep -Seconds 30
  }
} finally {
  $mutex.ReleaseMutex() | Out-Null
}
