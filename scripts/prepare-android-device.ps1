[CmdletBinding()]
param(
  [string]$Serial
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'use-dev-env.ps1')

$adbCommand = Get-Command adb -ErrorAction Stop
$deviceLines = & $adbCommand.Source devices
if ($LASTEXITCODE -ne 0) {
  throw 'adb devices gagal. Periksa instalasi Android SDK Platform Tools.'
}

$connectedDevices = @(
  foreach ($line in $deviceLines) {
    if ($line -match '^(?<serial>\S+)\s+(?<state>device|offline|unauthorized)(?:\s+.*)?$') {
      [pscustomobject]@{
        Serial = $Matches.serial
        State = $Matches.state
      }
    }
  }
)

$physicalDevices = @(
  $connectedDevices | Where-Object { $_.Serial -notlike 'emulator-*' }
)

if ($Serial) {
  $targetDevice = $physicalDevices |
    Where-Object { $_.Serial -eq $Serial } |
    Select-Object -First 1

  if (-not $targetDevice) {
    throw "Perangkat fisik '$Serial' tidak ditemukan. Jalankan 'adb devices -l'."
  }
} elseif ($physicalDevices.Count -eq 0) {
  throw 'Tidak ada perangkat Android fisik. Hubungkan kabel data, aktifkan USB debugging, lalu setujui dialog RSA.'
} elseif ($physicalDevices.Count -gt 1) {
  $serialList = ($physicalDevices.Serial -join ', ')
  throw "Lebih dari satu perangkat fisik ditemukan: $serialList. Ulangi dengan -Serial <device-id>."
} else {
  $targetDevice = $physicalDevices[0]
}

if ($targetDevice.State -eq 'unauthorized') {
  throw "Perangkat '$($targetDevice.Serial)' belum diotorisasi. Buka kunci ponsel dan setujui dialog RSA USB debugging."
}

if ($targetDevice.State -ne 'device') {
  throw "Perangkat '$($targetDevice.Serial)' berstatus '$($targetDevice.State)'. Sambungkan ulang sebelum melanjutkan."
}

$emulatorPorts = @(9099, 8080, 5001)
foreach ($port in $emulatorPorts) {
  & $adbCommand.Source -s $targetDevice.Serial reverse "tcp:$port" "tcp:$port"
  if ($LASTEXITCODE -ne 0) {
    throw "Gagal meneruskan port $port ke perangkat '$($targetDevice.Serial)'."
  }
}

Write-Host "Perangkat fisik siap: $($targetDevice.Serial)"
Write-Host 'Port lokal yang diteruskan:'
& $adbCommand.Source -s $targetDevice.Serial reverse --list
if ($LASTEXITCODE -ne 0) {
  throw 'Gagal memverifikasi daftar adb reverse.'
}

Write-Host ''
Write-Host 'Jalankan aplikasi dari apps/mobile:'
Write-Host ". .\..\..\scripts\use-dev-env.ps1"
Write-Host "flutter run -d '$($targetDevice.Serial)' --dart-define=USE_FIREBASE_EMULATORS=true --dart-define=FIREBASE_EMULATOR_HOST=127.0.0.1"
