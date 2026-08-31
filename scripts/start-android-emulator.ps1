$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'use-dev-env.ps1')

$emulatorArguments = @(
  '-avd', 'KudaPrima_API_29',
  '-memory', '2048',
  '-gpu', 'auto',
  '-camera-front', 'emulated',
  '-no-boot-anim'
)

& (Join-Path $env:ANDROID_HOME 'emulator\emulator.exe') @emulatorArguments
