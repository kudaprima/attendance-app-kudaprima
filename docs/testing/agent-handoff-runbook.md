# Codex and Antigravity handoff runbook

## Scope and ownership

Use one VS Code workspace and one editing agent at a time. Keep product decisions
in the existing domain/security documents, accepted plans in `docs/plans/`, and
the active task in `docs/handoff/current-task.md`.

Read `AGENTS.md` and the checkpoint before acting. The latest explicit user
instruction controls scope. While the status is `HOLD_APPLICATION_IMPLEMENTATION`,
only the specifically authorized setup/documentation and read-only diagnostics
may proceed. An approved plan, successful login, available quota, or passing
readiness check does not authorize starting application implementation.

Do not require a clean working tree for a transfer. Preserve existing changes,
including untracked files. Do not automatically stash, reset, clean, change branch,
commit, push, or open a PR. Read `CONTRIBUTING.md` before Git commands.

## Windows PATH for agy

The verified installation for this setup is `%USERPROFILE%\.gemini\bin\agy.exe`.
Check that path before adding it; do not add a guessed directory. The CLI directory
being absent from PATH is separate from the reported PreToolUse hook error.

### Immediate use without changing persistent PATH

Open PowerShell and run:

```powershell
$agyBin = Join-Path $env:USERPROFILE '.gemini\bin'
$agyExe = Join-Path $agyBin 'agy.exe'
if (-not (Test-Path -LiteralPath $agyExe -PathType Leaf)) {
  throw "agy.exe tidak ditemukan pada $agyExe"
}
& $agyExe --version
```

This does not sign in, submit a model request, or modify persistent PATH.

### Add the directory to user PATH through Windows

1. Open Start and search **Edit environment variables for your account**.
   Alternatively open **Edit the system environment variables**, then
   **Environment Variables**.
2. In **User variables**, select **Path** and click **Edit**. If the user Path does
   not exist, create it with only the CLI directory as its initial value.
3. Record the existing entries before editing. Add the resolved directory from
   the command above as a **new entry**, for example the expansion of
   `%USERPROFILE%\.gemini\bin`. Do not include `agy.exe` itself.
4. Avoid adding a duplicate. Preserve all existing entries and leave **System
   variables** unchanged.
5. Confirm the dialogs with **OK**.
6. Save editor buffers, stop any active agent task, close all VS Code windows
   normally, and reopen VS Code from Start. If any development service is active,
   follow its normal shutdown/persistence procedure before closing its terminal.
   Do not terminate it merely to refresh PATH.
7. Open a new integrated PowerShell terminal and verify:

```powershell
Get-Command agy | Select-Object Name, Source
agy --version
```

A new terminal created by an already-running VS Code process can inherit the old
PATH; a fresh VS Code process avoids that ambiguity.

If Windows dialogs are inconvenient, the PowerShell method below performs the same
user-level addition with a backup. Use one method, not both.

### Alternative: add to user PATH with PowerShell

Run the entire block in a normal PowerShell window; administrator access is not
required. This backs up the old user PATH under the local user profile and preserves
the existing PATH text when appending the missing entry. It does not change System
PATH. Do not substitute the combined process `$env:Path` for the user PATH.

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $agyBin = Join-Path $env:USERPROFILE '.gemini\bin'
  $agyExe = Join-Path $agyBin 'agy.exe'
  if (-not (Test-Path -LiteralPath $agyExe -PathType Leaf)) {
    throw "agy.exe tidak ditemukan pada $agyExe"
  }

  $agyUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $agyAlreadyPresent = @($agyUserPath -split ';' | Where-Object {
    [Environment]::ExpandEnvironmentVariables(
      $_.Trim().Trim('"')
    ).TrimEnd('\') -ieq $agyBin.TrimEnd('\')
  }).Count -gt 0

  if (-not $agyAlreadyPresent) {
    $agyBackupDir = Join-Path $env:LOCALAPPDATA 'agy-path-backups'
    New-Item -ItemType Directory -Path $agyBackupDir -Force | Out-Null
    $agyBackupFile = Join-Path $agyBackupDir (
      'user-path-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.json'
    )
    [pscustomobject]@{
      Path = $agyUserPath
      AddedEntry = $agyBin
    } | ConvertTo-Json | Set-Content -LiteralPath $agyBackupFile -Encoding UTF8

    $agySeparator = if (
      [string]::IsNullOrEmpty($agyUserPath) -or $agyUserPath.EndsWith(';')
    ) { '' } else { ';' }
    $agyUpdatedPath = $agyUserPath + $agySeparator + $agyBin
    [Environment]::SetEnvironmentVariable('Path', $agyUpdatedPath, 'User')
    Write-Host "PATH pengguna diperbarui. Backup: $agyBackupFile"
  } else {
    Write-Host 'Folder agy sudah ada pada PATH pengguna.'
  }

  # Update only this terminal as well, without replacing its other PATH entries.
  $agySessionHasPath = @($env:Path -split ';' | Where-Object {
    [Environment]::ExpandEnvironmentVariables(
      $_.Trim().Trim('"')
    ).TrimEnd('\') -ieq $agyBin.TrimEnd('\')
  }).Count -gt 0
  if (-not $agySessionHasPath) {
    $env:Path = $agyBin + ';' + $env:Path
  }
  Get-Command agy | Select-Object Name, Source
  agy --version
  if ($LASTEXITCODE -ne 0) { throw 'Verifikasi agy gagal.' }
}
```

Expected for the currently verified installation: the command resolves to the
`.gemini\bin` directory and prints `1.2.2`. Future updates can change the version.
Fresh VS Code processes should resolve the command without the session-only update.

To undo the addition, remove only the newly added directory through the user PATH
dialog. Retain the backup for comparison. Do not blindly restore an older full
PATH after other software has changed it, because that can discard newer entries.

## Rule discovery

The workspace rule is `.agents/rules/project-context.md`, with frontmatter
`trigger: always_on`. It routes the agent to shared instructions instead of
duplicating domain policies.

In the Antigravity sidebar, open **Customizations > Rules** and confirm that the
rule appears and is set to **Always On**. Start a fresh chat if necessary. File
existence alone does not prove that the installed extension applied it.

During initial verification, use **Request Review** for terminal commands and
inspect existing allowlist entries. A Markdown rule and an owner field are not
technical write locks. Review command and edit permissions separately.

Reference: [Google workspace rules](https://www.antigravity.google/docs/ide/rules/).

## Read-only readiness prompt

Run this from Antigravity, not merely from an ordinary terminal:

```text
Lakukan audit kesiapan handoff READ-ONLY pada workspace ini.

Baca AGENTS.md, docs/handoff/current-task.md,
.agents/rules/project-context.md, docs/testing/agent-handoff-runbook.md,
skill continuity dan attendance, serta dokumen status dan rencana yang dirujuk.
Sebutkan apakah rule project-context dikenali sebagai Always On; bedakan
bukti dari panel aturan dengan sekadar membaca isi file rule.

Baca CONTRIBUTING.md. Melalui tool terminal Anda sendiri, jalankan:
- git branch --show-current
- git rev-parse HEAD
- git status --short --untracked-files=all

Laporkan path workspace, hasil aktual, exit status, dan sumber bukti.
Jelaskan status HOLD_APPLICATION_IMPLEMENTATION, scope yang diizinkan,
perbedaan role sekarang dan target, serta offline queue yang belum tersedia.
Sebutkan aturan immutable events, cross-approval, environment Drive D,
dan pemisahan dataset emulator manual dari integration tests.

Jangan membuat/mengedit file, mengubah PATH/hook/settings, membaca rahasia
atau dataset emulator, menjalankan install/build/test/format/migrasi/seed,
commit/push/PR/deploy, atau menggunakan subagent.
Jika hook gagal, berhenti dan laporkan error relevan yang sudah disanitasi.
Jangan menyimpulkan isi dokumen yang belum berhasil dibaca. Tandai bagian
domain yang sumbernya tidak tersedia sebagai BELUM TERVERIFIKASI.
Jangan menciptakan role, aturan persetujuan, atau fitur di luar sumber proyek.
Jangan menonaktifkan hook atau mengganti shell untuk melewati kegagalan.
Kembalikan usulan checkpoint dalam chat, lalu berhenti.
```

## Acceptance and troubleshooting

| Check           | Required evidence                                                               |
| --------------- | ------------------------------------------------------------------------------- |
| Workspace       | The repository path actually opened by the agent                                |
| Rule routing    | Rule visible as Always On, plus a response consistent with the checkpoint       |
| Terminal runner | Actual output and exit status of the three Git commands through Antigravity     |
| Context         | Correct current/target role distinction, planned offline queue, and active hold |
| Scope           | No application mutation; pre-existing changes preserved                         |
| Handoff         | Next bounded action and unresolved items recorded without invented success      |

Normal-terminal Git output is useful corroboration, but does not validate an
Antigravity PreToolUse hook. If `datacloud_telemetry_PreToolUse` fails, collect
only the relevant error and examine its command, interpreter, path quoting, and
runner shell. Diagnose before making a narrowly authorized repair. Do not execute
the telemetry script manually or disable all hooks as a generic workaround.

The presence of the telemetry JavaScript file does not prove its invocation works.
A working `agy --version` does not prove model authentication, rule discovery,
quota, or hook execution. Record these checks separately.

## Transfer protocol after readiness

1. The outgoing agent updates the checkpoint after each bounded task, while it
   still has quota. Record objective, authorized scope, files changed, decisions,
   commands/tests actually run, failures, and next action.
2. Finish or safely stop active mutations. Save intended edits. Do not leave a
   second agent editing the same files. Keep shared development services under
   their normal lifecycle; do not restart or reset them for a handoff.
3. Mark the outgoing owner released. The incoming agent reads the checkpoint,
   checks branch/HEAD/status/diff, and verifies no other agent is editing before
   claiming the work.
4. If a tool fails, report that limitation. Never replace missing evidence with
   a guessed result or reclassify old test results as newly passed.
5. Continue only within the existing authorization. While on hold, continue
   readiness work only. The user must explicitly start application work.
6. Update the checkpoint before returning control. For a read-only task, return
   proposed updates in chat for an authorized writer to record.

Keep the checkpoint concise. Do not copy full conversations, credentials, employee
records, photos, signing material, or device serials into shared documentation.
For software validation after application work is authorized, use the existing
quality gates and relevant testing runbooks.
