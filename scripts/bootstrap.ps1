$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'use-dev-env.ps1')

Push-Location (Split-Path $PSScriptRoot)
try {
  pnpm install --frozen-lockfile
  Push-Location 'apps\mobile'
  try {
    flutter pub get
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
