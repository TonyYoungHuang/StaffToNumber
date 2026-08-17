param(
  [switch] $RunIntegrationTests
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

function Read-DpapiSecret([string] $Path) {
  $encrypted = (Get-Content -LiteralPath $Path -Raw).Trim()
  if (-not $encrypted) {
    throw "Encrypted secret file is empty: $Path"
  }

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

$root = Split-Path -Parent $PSScriptRoot
$postgresSecret = Join-Path $root "deploy/cloudflare/.env.neon-app-url"
$postgresOwnerSecret = Join-Path $root "deploy/cloudflare/.env.neon-owner-url"
$redisSecret = Join-Path $root "deploy/cloudflare/.env.upstash-redis-url"

$previousPostgresUrl = $env:POSTGRES_URL
$previousRedisUrl = $env:REDIS_URL
$previousPostgresTestUrl = $env:POSTGRES_TEST_URL
$previousJobBrokerTestUrl = $env:JOB_BROKER_TEST_URL
$previousTestRedisUrl = $env:TEST_REDIS_URL
try {
  $env:POSTGRES_URL = Read-DpapiSecret $postgresSecret
  & node (Join-Path $root "scripts/verify-postgres-runtime.mjs")
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL runtime verification failed." }

  $env:REDIS_URL = Read-DpapiSecret $redisSecret
  & node (Join-Path $root "scripts/verify-redis-runtime.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Redis runtime verification failed." }

  if ($RunIntegrationTests) {
    $env:POSTGRES_TEST_URL = Read-DpapiSecret $postgresOwnerSecret
    & node --import tsx --test (Join-Path $root "services/api/src/lib/postgres-migration.integration.test.ts")
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL migration integration test failed." }

    $env:JOB_BROKER_TEST_URL = $env:REDIS_URL
    & node --import tsx --test (Join-Path $root "services/api/src/lib/job-broker-dispatch.integration.test.ts")
    if ($LASTEXITCODE -ne 0) { throw "API BullMQ integration test failed." }
    & node --import tsx --test (Join-Path $root "services/worker/src/job-broker-consumer.integration.test.ts")
    if ($LASTEXITCODE -ne 0) { throw "Worker BullMQ integration test failed." }

    $env:TEST_REDIS_URL = $env:REDIS_URL
    & node --import tsx --test (Join-Path $root "services/collaboration/src/redis.integration.test.ts")
    if ($LASTEXITCODE -ne 0) { throw "Collaboration Redis integration test failed." }
  }
}
finally {
  $env:POSTGRES_URL = $previousPostgresUrl
  $env:REDIS_URL = $previousRedisUrl
  $env:POSTGRES_TEST_URL = $previousPostgresTestUrl
  $env:JOB_BROKER_TEST_URL = $previousJobBrokerTestUrl
  $env:TEST_REDIS_URL = $previousTestRedisUrl
}
