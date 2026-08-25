param(
  [string] $Schema = "scoretransposer",
  [string] $ReportPath = ".tmp/backup-restore/postgres-report.json",
  [string] $PostgresClientBin = ""
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
  $plain = [Security.Cryptography.ProtectedData]::Unprotect(
    $cipher,
    $null,
    [Security.Cryptography.DataProtectionScope]::CurrentUser
  )
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
    finally { $sha256.Dispose() }
  }
  finally { $stream.Dispose() }
}

function Remove-DisposableRestoreTarget([string] $ContainerName) {
  if (-not $ContainerName) { return $true }
  $exists = (& docker ps -a --filter "name=^/$ContainerName$" --format "{{.Names}}" 2>$null) -eq $ContainerName
  if ($exists) {
    & docker rm -fv $ContainerName 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { return $false }
  }
  $remaining = (& docker ps -a --filter "name=^/$ContainerName$" --format "{{.Names}}" 2>$null) -eq $ContainerName
  return -not $remaining
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
$sourceCountsPath = Join-Path $work "source-counts.txt"
$restoreCountsPath = Join-Path $work "restore-counts.txt"
$sourceFingerprintPath = Join-Path $work "source-fingerprint.txt"
$restoreFingerprintPath = Join-Path $work "restore-fingerprint.txt"
$sourceVersionPath = Join-Path $work "source-version.txt"
$restoreVersionPath = Join-Path $work "restore-version.txt"
$dumpListPath = Join-Path $work "dump-list.txt"
$startedAt = [DateTime]::UtcNow
$containerRemoved = $false

New-Item -ItemType Directory -Force -Path $work | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent (Join-Path $root $ReportPath)) | Out-Null

$postgresUrl = Read-DpapiSecret (Join-Path $root "deploy/cloudflare/.env.neon-production-owner-url")
$postgresDatabase = ([Uri]$postgresUrl).AbsolutePath.TrimStart("/")
if (-not $postgresDatabase) { throw "Configured production PostgreSQL URL does not contain a database name." }
if ($postgresDatabase -match "(?i)staging") {
  throw "Configured production PostgreSQL secret points to a staging database."
}
$postgresUrl = $postgresUrl -replace "sslmode=verify-full", "sslmode=require"
$postgresUrl = $postgresUrl -replace "&channel_binding=require", ""
$postgresUrl = "$postgresUrl&sslnegotiation=direct&connect_timeout=30&keepalives=1&keepalives_idle=10&keepalives_interval=5&keepalives_count=3"
$dockerPostgresUrl = $postgresUrl

try {
  Write-Utf8NoBom $envFile (@("PGSOURCE=$dockerPostgresUrl", "PGSCHEMA=$Schema") -join "`n")

  Write-Utf8NoBom (Join-Path $work "counts.sql") @'
SELECT format('SELECT %L, count(*) FROM %I.%I;', tablename, schemaname, tablename)
FROM pg_tables
WHERE schemaname = :'schema'
ORDER BY tablename
\gexec
'@

  Write-Utf8NoBom (Join-Path $work "fingerprint.sql") @'
WITH objects AS (
  SELECT concat_ws('|', 'column', n.nspname, c.relname, a.attnum::text, a.attname,
    format_type(a.atttypid, a.atttypmod), a.attnotnull::text,
    COALESCE(pg_get_expr(ad.adbin, ad.adrelid), '')) AS definition
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  WHERE n.nspname = :'schema' AND a.attnum > 0 AND NOT a.attisdropped
  UNION ALL
  SELECT concat_ws('|', 'constraint', n.nspname, COALESCE(c.relname, ''), con.conname,
    con.contype::text, pg_get_constraintdef(con.oid, true))
  FROM pg_constraint con
  JOIN pg_namespace n ON n.oid = con.connamespace
  LEFT JOIN pg_class c ON c.oid = con.conrelid
  WHERE n.nspname = :'schema'
  UNION ALL
  SELECT concat_ws('|', 'index', n.nspname, t.relname, i.relname, pg_get_indexdef(ix.indexrelid))
  FROM pg_index ix
  JOIN pg_class t ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = :'schema'
  UNION ALL
  SELECT concat_ws('|', 'trigger', n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid, true))
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = :'schema' AND NOT t.tgisinternal
  UNION ALL
  SELECT concat_ws('|', 'function', n.nspname, p.oid::regprocedure::text, pg_get_functiondef(p.oid))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = :'schema'
  UNION ALL
  SELECT concat_ws('|', 'view', schemaname, viewname, definition)
  FROM pg_views
  WHERE schemaname = :'schema'
  UNION ALL
  SELECT concat_ws('|', 'sequence', schemaname, sequencename, data_type, start_value::text,
    min_value::text, max_value::text, increment_by::text, cycle::text, cache_size::text)
  FROM pg_sequences
  WHERE schemaname = :'schema'
  UNION ALL
  SELECT concat_ws('|', 'policy', schemaname, tablename, policyname, permissive, roles::text,
    cmd, COALESCE(qual, ''), COALESCE(with_check, ''))
  FROM pg_policies
  WHERE schemaname = :'schema'
)
SELECT count(*)::text || '|' || md5(COALESCE(string_agg(replace(definition, E'\r', ''), E'\n' ORDER BY definition), ''))
FROM objects;
'@

  Write-Utf8NoBom (Join-Path $work "version.sql") "SHOW server_version;"
  $mount = "$($work -replace '\\','/'):/work"

  if ($PostgresClientBin) {
    $resolvedClientBin = (Resolve-Path -LiteralPath $PostgresClientBin).Path
    $pgDump = Join-Path $resolvedClientBin "pg_dump.exe"
    $psql = Join-Path $resolvedClientBin "psql.exe"
    $pgRestore = Join-Path $resolvedClientBin "pg_restore.exe"
    foreach ($client in @($pgDump, $psql, $pgRestore)) {
      if (-not (Test-Path -LiteralPath $client -PathType Leaf)) { throw "PostgreSQL client binary is missing: $client" }
    }

    $hostDumpPassed = $false
    for ($attempt = 1; $attempt -le 3; $attempt += 1) {
      Remove-Item -LiteralPath $dumpPath -Force -ErrorAction SilentlyContinue
      & $pgDump "--dbname=$postgresUrl" "--schema=$Schema" "--format=custom" "--no-owner" "--no-acl" "--file=$dumpPath"
      if ($LASTEXITCODE -eq 0) { $hostDumpPassed = $true; break }
      if ($attempt -lt 3) { Start-Sleep -Seconds 5 }
    }
    if (-not $hostDumpPassed) { throw "Host pg_dump failed after three attempts." }
    $sourceCountsOutput = (& $psql $postgresUrl "-v" "ON_ERROR_STOP=1" "-v" "schema=$Schema" "-At" "-F" "|" "-f" (Join-Path $work "counts.sql")) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "Host psql failed to collect source row counts." }
    Write-Utf8NoBom $sourceCountsPath $sourceCountsOutput
    $sourceFingerprintOutput = (& $psql $postgresUrl "-v" "ON_ERROR_STOP=1" "-v" "schema=$Schema" "-At" "-f" (Join-Path $work "fingerprint.sql")) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "Host psql failed to collect the source structural fingerprint." }
    Write-Utf8NoBom $sourceFingerprintPath $sourceFingerprintOutput
    $sourceVersionOutput = (& $psql $postgresUrl "-v" "ON_ERROR_STOP=1" "-At" "-f" (Join-Path $work "version.sql")) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "Host psql failed to collect the source PostgreSQL version." }
    Write-Utf8NoBom $sourceVersionPath $sourceVersionOutput
    $dumpListOutput = (& $pgRestore "--list" $dumpPath) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "Host pg_restore could not inspect the backup catalog." }
    Write-Utf8NoBom $dumpListPath $dumpListOutput
  }
  else {
    $backupCommand = (@'
set -euo pipefail
retry_to_file() {
  local output="$1"
  shift
  for attempt in 1 2 3; do
    rm -f "$output"
    if "$@" > "$output"; then return 0; fi
    if [ "$attempt" -lt 3 ]; then sleep 5; fi
  done
  return 1
}
for attempt in 1 2 3; do
  rm -f /work/source.dump
  if timeout 300 pg_dump --dbname="$PGSOURCE" --schema="$PGSCHEMA" --format=custom --no-owner --no-acl --file=/work/source.dump; then break; fi
  if [ "$attempt" -eq 3 ]; then exit 1; fi
  sleep 5
done
retry_to_file /work/source-counts.txt timeout 180 psql "$PGSOURCE" -v ON_ERROR_STOP=1 -v schema="$PGSCHEMA" -At -F '|' -f /work/counts.sql
retry_to_file /work/source-fingerprint.txt timeout 180 psql "$PGSOURCE" -v ON_ERROR_STOP=1 -v schema="$PGSCHEMA" -At -f /work/fingerprint.sql
retry_to_file /work/source-version.txt timeout 60 psql "$PGSOURCE" -v ON_ERROR_STOP=1 -At -f /work/version.sql
pg_restore --list /work/source.dump > /work/dump-list.txt
'@) -replace "`r", ""
    Invoke-DockerChecked @("run", "--rm", "--network", "host", "--env-file", $envFile, "-v", $mount, "postgres:17-bookworm", "bash", "-lc", $backupCommand)
  }

  Invoke-DockerChecked @(
    "run", "-d", "--name", $container,
    "--label", "com.scoretransposer.purpose=backup-restore-drill",
    "-e", "POSTGRES_PASSWORD=$dbPassword", "-e", "POSTGRES_DB=restore",
    "postgres:17-bookworm"
  )

  $ready = $false
  $consecutiveReadyChecks = 0
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    $running = (& docker inspect --format "{{.State.Running}}" $container 2>$null).Trim()
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
      & docker exec $container psql -U postgres -d restore -Atqc "SELECT 1" 2>&1 | Out-Null
      $probeExitCode = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $previousErrorActionPreference }
    if ($running -eq "true" -and $probeExitCode -eq 0) {
      $consecutiveReadyChecks += 1
      if ($consecutiveReadyChecks -ge 3) { $ready = $true; break }
    }
    else { $consecutiveReadyChecks = 0 }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) {
    $containerLogs = (& docker logs --tail 80 $container 2>&1) -join "`n"
    throw "Ephemeral PostgreSQL restore target did not become stably ready.`n$containerLogs"
  }

  Invoke-DockerChecked @("cp", $dumpPath, "${container}:/tmp/source.dump")
  Invoke-DockerChecked @("cp", (Join-Path $work "counts.sql"), "${container}:/tmp/counts.sql")
  Invoke-DockerChecked @("cp", (Join-Path $work "fingerprint.sql"), "${container}:/tmp/fingerprint.sql")
  Invoke-DockerChecked @("cp", (Join-Path $work "version.sql"), "${container}:/tmp/version.sql")
  Invoke-DockerChecked @(
    "exec", $container, "pg_restore", "--exit-on-error", "--username=postgres",
    "--dbname=restore", "--no-owner", "--no-acl", "/tmp/source.dump"
  )

  $restoredCountsOutput = (& docker exec $container psql -U postgres -d restore -v ON_ERROR_STOP=1 -v "schema=$Schema" -At -F "|" -f /tmp/counts.sql) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "Failed to collect restored PostgreSQL row counts." }
  Write-Utf8NoBom $restoreCountsPath $restoredCountsOutput

  $restoredFingerprintOutput = (& docker exec $container psql -U postgres -d restore -v ON_ERROR_STOP=1 -v "schema=$Schema" -At -f /tmp/fingerprint.sql) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "Failed to collect restored PostgreSQL structural fingerprint." }
  Write-Utf8NoBom $restoreFingerprintPath $restoredFingerprintOutput

  $restoredVersionOutput = (& docker exec $container psql -U postgres -d restore -v ON_ERROR_STOP=1 -At -f /tmp/version.sql) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "Failed to collect restored PostgreSQL version." }
  Write-Utf8NoBom $restoreVersionPath $restoredVersionOutput

  $sourceCounts = @(Get-Content -LiteralPath $sourceCountsPath | Where-Object { $_.Trim() })
  $restoreCounts = @(Get-Content -LiteralPath $restoreCountsPath | Where-Object { $_.Trim() })
  $sourceFingerprint = (Get-Content -LiteralPath $sourceFingerprintPath -Raw).Trim()
  $restoreFingerprint = (Get-Content -LiteralPath $restoreFingerprintPath -Raw).Trim()
  $sourceVersion = (Get-Content -LiteralPath $sourceVersionPath -Raw).Trim()
  $restoreVersion = (Get-Content -LiteralPath $restoreVersionPath -Raw).Trim()
  $dumpObjectCount = @(Get-Content -LiteralPath $dumpListPath | Where-Object { $_ -and -not $_.StartsWith(";") }).Count
  $totalRows = 0L
  $nonEmptyTableCount = 0
  foreach ($entry in $sourceCounts) {
    $parts = $entry -split "\|", 2
    if ($parts.Count -eq 2) {
      $rows = [int64]$parts[1]
      $totalRows += $rows
      if ($rows -gt 0) { $nonEmptyTableCount += 1 }
    }
  }
  $countsMatch = (($sourceCounts -join "`n") -eq ($restoreCounts -join "`n")) -and $sourceCounts.Count -gt 0
  $fingerprintsMatch = $sourceFingerprint -and ($sourceFingerprint -eq $restoreFingerprint)
  $dumpHash = Get-Sha256 $dumpPath

  $containerRemoved = Remove-DisposableRestoreTarget $container
  if (-not $containerRemoved) { throw "Disposable PostgreSQL restore target could not be removed." }
  $container = $null

  $postgresPassed = $countsMatch -and $fingerprintsMatch -and $dumpObjectCount -gt 0 -and $containerRemoved
  $report = [ordered]@{
    schemaVersion = 2
    environment = "production"
    startedAt = $startedAt.ToString("o")
    completedAt = [DateTime]::UtcNow.ToString("o")
    passed = [bool]$postgresPassed
    scope = "Read-only logical backup from production PostgreSQL and restore into a disposable PostgreSQL 17 target"
    schema = $Schema
    sourceDatabase = $postgresDatabase
    sourcePostgresVersion = $sourceVersion
    restorePostgresVersion = $restoreVersion
    tableCount = $sourceCounts.Count
    nonEmptyTableCount = $nonEmptyTableCount
    totalRows = $totalRows
    dumpObjectCount = $dumpObjectCount
    sourceAndRestoreCountsMatch = [bool]$countsMatch
    sourceCatalogFingerprint = $sourceFingerprint
    restoredCatalogFingerprint = $restoreFingerprint
    structuralFingerprintMatch = [bool]$fingerprintsMatch
    dumpSha256 = $dumpHash
    dumpBytes = (Get-Item -LiteralPath $dumpPath).Length
    dumpPath = ".tmp/backup-restore/source.dump"
    sourceCounts = $sourceCounts
    restoredCounts = $restoreCounts
    productionWritesPerformed = $false
    ephemeralTargetRemoved = [bool]$containerRemoved
    limitations = @(
      "This is a logical restore exercise, not a Neon provider point-in-time recovery exercise.",
      "The production schema may be empty; structural fingerprint and dump catalog checks supplement row-count validation."
    )
  }
  Write-Utf8NoBom (Join-Path $root $ReportPath) ($report | ConvertTo-Json -Depth 12)
  if (-not $report.passed) { throw "PostgreSQL backup and restore drill did not pass." }
  Write-Host "PostgreSQL backup and restore drill passed: $ReportPath"
}
finally {
  if ($container) { Remove-DisposableRestoreTarget $container | Out-Null }
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
  $postgresUrl = $null
  $dbPassword = $null
}
