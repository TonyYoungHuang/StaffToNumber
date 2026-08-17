param(
  [string] $Database = "scoretransposer_production",
  [string] $Schema = "scoretransposer",
  [string] $RuntimeRole = "scoretransposer_runtime",
  [string] $EvidencePath = "docs/audits/evidence/production-postgres-bootstrap-2026-08-17.json"
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

function Write-DpapiSecret([string] $Path, [string] $Value) {
  $plain = [Text.Encoding]::Unicode.GetBytes($Value)
  $cipher = [Security.Cryptography.ProtectedData]::Protect($plain, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  $encrypted = [BitConverter]::ToString($cipher).Replace("-", "")
  [IO.File]::WriteAllText($Path, $encrypted, (New-Object Text.UTF8Encoding($false)))
}

function Set-DatabaseName([string] $Url, [string] $Name) {
  $builder = New-Object UriBuilder($Url)
  $builder.Path = "/$Name"
  return $builder.Uri.AbsoluteUri
}

function Invoke-DockerChecked([string[]] $Arguments) {
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed." }
}

function Write-Utf8NoBom([string] $Path, [string] $Content) {
  [IO.File]::WriteAllText($Path, $Content, (New-Object Text.UTF8Encoding($false)))
}

if ($Database -notmatch '^[a-z][a-z0-9_]+$') { throw "Unsafe PostgreSQL database name." }
if ($Schema -notmatch '^[a-z][a-z0-9_]+$') { throw "Unsafe PostgreSQL schema name." }
if ($RuntimeRole -notmatch '^[a-z][a-z0-9_]+$') { throw "Unsafe PostgreSQL role name." }

$root = Split-Path -Parent $PSScriptRoot
$work = Join-Path $root ".tmp/production-postgres-bootstrap"
$sourceOwnerPath = Join-Path $root "deploy/cloudflare/.env.neon-owner-url"
$sourceRuntimePath = Join-Path $root "deploy/cloudflare/.env.neon-app-url"
$productionOwnerPath = Join-Path $root "deploy/cloudflare/.env.neon-production-owner-url"
$productionRuntimePath = Join-Path $root "deploy/cloudflare/.env.neon-production-app-url"
$envFile = Join-Path $work "postgres.env"
$dumpPath = Join-Path $work "schema.dump"
$startedAt = [DateTime]::UtcNow

New-Item -ItemType Directory -Force -Path $work | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent (Join-Path $root $EvidencePath)) | Out-Null

$sourceOwnerUrl = Read-DpapiSecret $sourceOwnerPath
$sourceRuntimeUrl = Read-DpapiSecret $sourceRuntimePath
$sourceDatabase = ([Uri]$sourceOwnerUrl).AbsolutePath.TrimStart("/")
if (-not $sourceDatabase) { throw "Source PostgreSQL URL has no database name." }
if ($sourceDatabase -notmatch "(?i)staging") {
  throw "Expected the source URL to be the staging schema source; found a non-staging database."
}

$productionOwnerUrl = Set-DatabaseName $sourceOwnerUrl $Database
$productionRuntimeUrl = Set-DatabaseName $sourceRuntimeUrl $Database
$sourceOwnerUrl = $sourceOwnerUrl -replace "sslmode=verify-full", "sslmode=require"
$productionOwnerUrlForTools = $productionOwnerUrl -replace "sslmode=verify-full", "sslmode=require"
$productionRuntimeUrlForTools = $productionRuntimeUrl -replace "sslmode=verify-full", "sslmode=require"

try {
  Write-Utf8NoBom $envFile (@(
    "SOURCE_OWNER_URL=$sourceOwnerUrl"
    "PRODUCTION_OWNER_URL=$productionOwnerUrlForTools"
    "PRODUCTION_RUNTIME_URL=$productionRuntimeUrlForTools"
    "PRODUCTION_DATABASE=$Database"
    "PGSCHEMA=$Schema"
    "RUNTIME_ROLE=$RuntimeRole"
  ) -join "`n")
  Write-Utf8NoBom (Join-Path $work "bootstrap.sh") @'
#!/usr/bin/env bash
set -euo pipefail
exists="$(timeout 60 psql "$SOURCE_OWNER_URL" -Atqc "SELECT 1 FROM pg_database WHERE datname = '$PRODUCTION_DATABASE'")"
if [ "$exists" != "1" ]; then
  timeout 60 psql "$SOURCE_OWNER_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $PRODUCTION_DATABASE"
fi
table_count="$(timeout 60 psql "$PRODUCTION_OWNER_URL" -Atqc "SELECT count(*) FROM pg_tables WHERE schemaname = '$PGSCHEMA'")"
if [ "$table_count" = "0" ]; then
  timeout 300 pg_dump --dbname="$SOURCE_OWNER_URL" --schema="$PGSCHEMA" --schema-only --format=custom --no-owner --no-acl --file=/work/schema.dump
  timeout 300 pg_restore --dbname="$PRODUCTION_OWNER_URL" --no-owner --no-acl /work/schema.dump
fi
timeout 60 psql "$SOURCE_OWNER_URL" -v ON_ERROR_STOP=1 -c "GRANT CONNECT ON DATABASE $PRODUCTION_DATABASE TO $RUNTIME_ROLE"
timeout 60 psql "$PRODUCTION_OWNER_URL" -v ON_ERROR_STOP=1 <<SQL
GRANT USAGE ON SCHEMA $PGSCHEMA TO $RUNTIME_ROLE;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA $PGSCHEMA TO $RUNTIME_ROLE;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA $PGSCHEMA TO $RUNTIME_ROLE;
ALTER DEFAULT PRIVILEGES IN SCHEMA $PGSCHEMA GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $RUNTIME_ROLE;
ALTER DEFAULT PRIVILEGES IN SCHEMA $PGSCHEMA GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO $RUNTIME_ROLE;
SQL
timeout 60 psql "$PRODUCTION_RUNTIME_URL" -v ON_ERROR_STOP=1 -Atqc "SELECT 1 FROM $PGSCHEMA.users LIMIT 0"
timeout 60 psql "$PRODUCTION_OWNER_URL" -Atqc "SELECT count(*) FROM pg_tables WHERE schemaname = '$PGSCHEMA'" > /work/table-count.txt
'@

  $mount = "$($work -replace '\\','/'):/work"
  Invoke-DockerChecked @("run", "--rm", "--env-file", $envFile, "-v", $mount, "postgres:17-bookworm", "bash", "/work/bootstrap.sh")

  $tableCount = [int](Get-Content -LiteralPath (Join-Path $work "table-count.txt") -Raw).Trim()
  if ($tableCount -lt 1) { throw "Production database schema contains no tables." }

  Write-DpapiSecret $productionOwnerPath $productionOwnerUrl
  Write-DpapiSecret $productionRuntimePath $productionRuntimeUrl

  $report = [ordered]@{
    schemaVersion = 1
    environment = "production"
    startedAt = $startedAt.ToString("o")
    completedAt = [DateTime]::UtcNow.ToString("o")
    passed = $true
    database = $Database
    schema = $Schema
    tableCount = $tableCount
    runtimeRole = $RuntimeRole
    source = "staging schema-only export"
    sourceRowsCopied = $false
    isolatedCredentialsCreated = @(
      "deploy/cloudflare/.env.neon-production-owner-url"
      "deploy/cloudflare/.env.neon-production-app-url"
    )
  }
  Write-Utf8NoBom (Join-Path $root $EvidencePath) ($report | ConvertTo-Json -Depth 6)
  Write-Host "Production PostgreSQL bootstrap passed: $Database ($tableCount tables)."
}
finally {
  Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
  $sourceOwnerUrl = $null
  $sourceRuntimeUrl = $null
  $productionOwnerUrl = $null
  $productionRuntimeUrl = $null
}
