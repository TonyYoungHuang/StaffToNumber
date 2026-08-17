[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $repositoryRoot ".tmp\staging-soak"
$logPath = Join-Path $logDirectory "scheduled-task.log"
$lockPath = Join-Path $logDirectory "scheduled-task.lock"

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

if (Test-Path -LiteralPath $lockPath) {
  $lockOwner = Get-Content -LiteralPath $lockPath -Raw -ErrorAction SilentlyContinue
  $lockProcess = if ($lockOwner -match '^\d+$') { Get-Process -Id ([int]$lockOwner) -ErrorAction SilentlyContinue } else { $null }
  if ($null -ne $lockProcess) {
    Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) skipped: previous sample is still running"
    exit 0
  }
  Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
}

Set-Content -LiteralPath $lockPath -Value $PID
try {
  Push-Location $repositoryRoot
  try {
    & npm.cmd run verify:staging:soak-sample *>> $logPath
    if ($LASTEXITCODE -ne 0) {
      throw "Staging soak sample failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }
}
catch {
  Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) ERROR: $($_.Exception.Message)"
  exit 1
}
finally {
  Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
}
