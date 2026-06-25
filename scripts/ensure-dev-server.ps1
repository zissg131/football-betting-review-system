$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$NodeDir = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$NodeExe = Join-Path $NodeDir "node.exe"
$LogDir = Join-Path $ProjectRoot "work"
$OutLog = Join-Path $LogDir "dev-server.log"
$ErrLog = Join-Path $LogDir "dev-server.err"

if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

function Test-Port3000 {
  $connection = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connection
}

if (Test-Port3000) {
  Write-Host "Football Edge Tracker is already running at http://127.0.0.1:3000/daily"
  exit 0
}

if (!(Test-Path $NodeExe)) {
  throw "Node.js runtime not found: $NodeExe"
}

Start-Process `
  -FilePath $NodeExe `
  -ArgumentList @("node_modules\next\dist\bin\next", "dev", "-H", "127.0.0.1", "-p", "3000") `
  -WorkingDirectory $ProjectRoot `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -WindowStyle Hidden

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Port3000) {
    Write-Host "Football Edge Tracker started at http://127.0.0.1:3000/daily"
    exit 0
  }
}

Write-Host "Server did not become ready within 30 seconds. Check logs:"
Write-Host $OutLog
Write-Host $ErrLog
exit 1
