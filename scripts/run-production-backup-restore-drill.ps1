param(
  [string] $Schema = "scoretransposer",
  [string] $ReportPath = ".tmp/backup-restore/postgres-report.json"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

function Read-DpapiSecret([string] $Path) {
  $encrypted = (Get-Content -LiteralPath $Path -Raw).Trim()
  if (-not $encrypted) { throw "Encrypted secret file is empty: $Path" }
  if ($encrypted -notmatch "^[0-9a-fA-F]+$" -or ($encrypted.Length % 2) -ne 0) {
    throw "Encrypted secret file is not a valid DPAPI payload: $Path"
  }
  $cipher = New-Object byte[] ($encrypted.Length / 2)
  for ($index = 0; $index -lt $cipher.Length; $index++) {
    $cipher[$index] = [Convert]::ToByte($encrypted.Substring($index * 2, 2), 16)
  }
  $plain = [Security.Cryptography.ProtectedData]::Unprotect($cipher, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  return [Text.Encoding]::Unicode.GetString($plain)
}

function Invoke-DockerChecked([string[]] $Arguments) {
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed: docker $($Arguments -join ' ')" }
}

function Write-Utf8NoBom([string] $Path, [string] $Content) {
  [IO.File]::WriteAllText($Path, $Content, (New-Object Text.UTF8Encoding($false)))
}

function Get-Sha256([string] $Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
      return ([BitConverter]::ToString($sha256.ComputeHash($stream))).Replace("-", "").ToLowerInvariant()
    }
    finally {
      $sha256.Dispose()
    }
  }
  finally {
    $stream.Dispose()
  }
}

$root = Split-Path -Parent $PSScriptRoot
$work = Join-Path $root ".tmp/backup-restore"
$container = "scoretransposer-restore-$([Guid]::NewGuid().ToString('N').Substring(0, 10))"
$passwordBytes = New-Object byte[] 24
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $random.GetBytes($passwordBytes) }
finally { $random.Dispose() }
$dbPassword = -join ($passwordBytes | ForEach-Object { $_.ToString("x2") })
$envFile = Join-Path $work "$container.env"
$dumpPath = Join-Path $work "source.dump"
$restoredDumpPath = Join-Path $work "restored.dump"
$sourceCountsPath = Join-Path $work "source-counts.txt"
$restoreCountsPath = Join-Path $work "restore-counts.txt"
$startedAt = [DateTime]::UtcNow
$drillId = $startedAt.ToString("yyyyMMddTHHmmssZ")

New-Item -ItemType Directory -Force -Path $work | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent (Join-Path $root $ReportPath)) | Out-Null

$postgresUrl = Read-DpapiSecret (Join-Path $root "deploy/cloudflare/.env.neon-production-owner-url")
$postgresDatabase = ([Uri]$postgresUrl).AbsolutePath.TrimStart("/")
if (-not $postgresDatabase) {
  throw "Configured production PostgreSQL URL does not contain a database name."
}
if ($postgresDatabase -match "(?i)staging") {
  throw "Configured production PostgreSQL secret points to a staging database. Create and bind an isolated production database before running this drill."
}
$postgresUrl = $postgresUrl -replace "sslmode=verify-full", "sslmode=require"
try {
  $dockerEnvironment = @(
    "PGSOURCE=$postgresUrl"
    "PGSCHEMA=$Schema"
  ) -join "`n"
  Write-Utf8NoBom $envFile $dockerEnvironment
  Write-Utf8NoBom (Join-Path $work "counts.sql") @'
SELECT format('SELECT %L, count(*) FROM %I.%I;', tablename, schemaname, tablename)
FROM pg_tables
WHERE schemaname = :'schema'
ORDER BY tablename
\gexec
'@

  $mount = "$($work -replace '\\','/'):/work"
  Invoke-DockerChecked @("run", "--rm", "--env-file", $envFile, "-v", $mount, "postgres:17-bookworm", "bash", "-lc", @'
set -euo pipefail
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates >/dev/null
timeout 300 pg_dump --dbname="$PGSOURCE" --schema="$PGSCHEMA" --format=custom --no-owner --no-acl --file=/work/source.dump
timeout 180 psql "$PGSOURCE" -v ON_ERROR_STOP=1 -v schema="$PGSCHEMA" -At -F '|' -f /work/counts.sql > /work/source-counts.txt
'@)

  Invoke-DockerChecked @("run", "-d", "--name", $container, "-e", "POSTGRES_PASSWORD=$dbPassword", "-e", "POSTGRES_DB=restore", "postgres:17-bookworm")
  $ready = $false
  $consecutiveReadyChecks = 0
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    $running = (& docker inspect --format "{{.State.Running}}" $container 2>$null).Trim()
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
      $probeOutput = & docker exec $container psql -U postgres -d restore -Atqc "SELECT 1" 2>&1
      $probeExitCode = $LASTEXITCODE
    }
    finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($running -eq "true" -and $probeExitCode -eq 0) {
      $consecutiveReadyChecks += 1
      if ($consecutiveReadyChecks -ge 5) { $ready = $true; break }
    }
    else {
      $consecutiveReadyChecks = 0
    }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $containerLogs = (& docker logs --tail 80 $container 2>&1) -join "`n"
    }
    finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    throw "Ephemeral PostgreSQL restore target did not become stably ready.`n$containerLogs"
  }

  Invoke-DockerChecked @("cp", $dumpPath, "${container}:/tmp/source.dump")
  Invoke-DockerChecked @("cp", (Join-Path $work "counts.sql"), "${container}:/tmp/counts.sql")
  Invoke-DockerChecked @("exec", $container, "pg_restore", "--username=postgres", "--dbname=restore", "--no-owner", "--no-acl", "/tmp/source.dump")
  $restoredCountsOutput = (& docker exec $container psql -U postgres -d restore -v ON_ERROR_STOP=1 -v "schema=$Schema" -At -F "|" -f /tmp/counts.sql) -join "`n"
  Write-Utf8NoBom $restoreCountsPath $restoredCountsOutput
  if ($LASTEXITCODE -ne 0) { throw "Failed to collect restored PostgreSQL row counts." }

  $sourceCounts = @(Get-Content -LiteralPath $sourceCountsPath | Where-Object { $_.Trim() })
  $restoreCounts = @(Get-Content -LiteralPath $restoreCountsPath | Where-Object { $_.Trim() })
  $postgresPassed = (($sourceCounts -join "`n") -eq ($restoreCounts -join "`n")) -and $sourceCounts.Count -gt 0
  $dumpHash = Get-Sha256 $dumpPath

  $report = [ordered]@{
    schemaVersion = 1
    environment = "production"
    startedAt = $startedAt.ToString("o")
    completedAt = [DateTime]::UtcNow.ToString("o")
    passed = [bool]$postgresPassed
    scope = "Read-only logical backup from the configured production PostgreSQL schema and restore into a disposable PostgreSQL 17 container"
    schema = $Schema
    tableCount = $sourceCounts.Count
    sourceAndRestoreCountsMatch = $postgresPassed
    dumpSha256 = $dumpHash
    dumpBytes = (Get-Item -LiteralPath $dumpPath).Length
    dumpPath = ".tmp/backup-restore/source.dump"
    sourceCounts = $sourceCounts
    restoredCounts = $restoreCounts
    productionWritesPerformed = $false
    limitations = @(
      "The PostgreSQL drill is a logical schema restore, not a provider point-in-time recovery exercise."
    )
  }
  Write-Utf8NoBom (Join-Path $root $ReportPath) ($report | ConvertTo-Json -Depth 12)
  if (-not $report.passed) { throw "PostgreSQL backup and restore drill did not pass." }
  Write-Host "PostgreSQL backup and restore drill passed: $ReportPath"
}
finally {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $cleanupOutput = & docker rm -f $container 2>&1
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
  $postgresUrl = $null
}
