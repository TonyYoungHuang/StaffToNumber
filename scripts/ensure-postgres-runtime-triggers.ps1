param(
  [ValidateSet("staging", "production")]
  [string]$Environment = "staging",
  [switch]$Verify
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

$repoRoot = Split-Path -Parent $PSScriptRoot
$ownerFile = Join-Path $repoRoot "deploy/cloudflare/.env.neon-owner-url"
$runtimeFile = Join-Path $repoRoot "deploy/cloudflare/.env.neon-app-url"
if ($Environment -eq "production") {
  $ownerFile = Join-Path $repoRoot "deploy/cloudflare/.env.neon-production-owner-url"
  $runtimeFile = Join-Path $repoRoot "deploy/cloudflare/.env.neon-production-app-url"
}

function Read-ProtectedValue([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Protected credential file is missing: $Path"
  }
  $hex = (Get-Content -LiteralPath $Path -Raw).Trim()
  $bytes = New-Object byte[] ($hex.Length / 2)
  for ($index = 0; $index -lt $bytes.Length; $index++) {
    $bytes[$index] = [Convert]::ToByte($hex.Substring($index * 2, 2), 16)
  }
  $plain = [System.Security.Cryptography.ProtectedData]::Unprotect(
    $bytes,
    $null,
    [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  )
  return [Text.Encoding]::Unicode.GetString($plain)
}

$previousOwnerUrl = $env:POSTGRES_OWNER_URL
$previousPostgresUrl = $env:POSTGRES_URL
$previousSchema = $env:POSTGRES_SCHEMA
try {
  $env:POSTGRES_SCHEMA = "scoretransposer"
  $env:POSTGRES_OWNER_URL = Read-ProtectedValue $ownerFile
  & node --import tsx scripts/ensure-postgres-runtime-triggers.mjs
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL runtime trigger repair failed." }

  if ($Verify) {
    $env:POSTGRES_URL = Read-ProtectedValue $runtimeFile
    Remove-Item Env:POSTGRES_OWNER_URL -ErrorAction SilentlyContinue
    & node scripts/verify-postgres-runtime.mjs
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL runtime verification failed." }
  }
} finally {
  if ($null -eq $previousOwnerUrl) { Remove-Item Env:POSTGRES_OWNER_URL -ErrorAction SilentlyContinue } else { $env:POSTGRES_OWNER_URL = $previousOwnerUrl }
  if ($null -eq $previousPostgresUrl) { Remove-Item Env:POSTGRES_URL -ErrorAction SilentlyContinue } else { $env:POSTGRES_URL = $previousPostgresUrl }
  if ($null -eq $previousSchema) { Remove-Item Env:POSTGRES_SCHEMA -ErrorAction SilentlyContinue } else { $env:POSTGRES_SCHEMA = $previousSchema }
}
