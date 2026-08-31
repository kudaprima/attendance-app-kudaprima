$developmentRoot = 'D:\Development'

$env:ANDROID_HOME = 'D:\Android\Sdk'
$env:ANDROID_SDK_ROOT = 'D:\Android\Sdk'
$env:ANDROID_USER_HOME = 'D:\Android\UserHome'
$env:ANDROID_AVD_HOME = 'D:\Android\Avd'
$env:GRADLE_USER_HOME = Join-Path $developmentRoot 'Caches\gradle'
$env:NPM_CONFIG_CACHE = Join-Path $developmentRoot 'Caches\npm'
$env:PUB_CACHE = Join-Path $developmentRoot 'Caches\dart-pub'
$env:PNPM_HOME = Join-Path $developmentRoot 'pnpm'
$env:FIREBASE_EMULATORS_PATH = Join-Path $developmentRoot 'Caches\firebase-emulators'

@(
  $env:GRADLE_USER_HOME,
  $env:NPM_CONFIG_CACHE,
  $env:PUB_CACHE,
  $env:PNPM_HOME,
  $env:FIREBASE_EMULATORS_PATH,
  $env:ANDROID_USER_HOME,
  $env:ANDROID_AVD_HOME
) | ForEach-Object {
  New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

$toolPaths = @(
  'D:\FlutterSDK\bin',
  $env:PNPM_HOME,
  (Join-Path $env:PUB_CACHE 'bin'),
  (Join-Path $env:ANDROID_HOME 'platform-tools'),
  (Join-Path $env:ANDROID_HOME 'emulator')
)

$commandLineTools = Get-ChildItem (Join-Path $env:ANDROID_HOME 'cmdline-tools') -Directory |
  Where-Object { $_.Name -match '^\d+(\.\d+)*$' } |
  Sort-Object { [version]$_.Name } -Descending |
  Select-Object -First 1

if ($commandLineTools) {
  $toolPaths += Join-Path $commandLineTools.FullName 'bin'
}

foreach ($toolPath in $toolPaths) {
  if (($env:Path -split ';') -notcontains $toolPath) {
    $env:Path = "$toolPath;$env:Path"
  }
}

Write-Host 'Environment development aktif; cache dan AVD diarahkan ke D:.'
