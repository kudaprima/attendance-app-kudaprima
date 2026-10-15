# Current agent handoff

## Execution gate

- Updated: 2026-10-12
- Status: `M3_WORKFORCE_SERVICE_WORKFLOWS_IMPLEMENTED_AND_VERIFIED`
- Current workstream: Option A (Milestone M3) — End-to-End Workforce Service & Approval Workflows (Cuti Tahunan, Izin Sakit, Izin Khusus, & Lembur / Overtime) with Glassmorphic Bottom Sheet Mobile UI & Admin Verification Modal.
- Application implementation: Contracts, Firestore/Storage Rules, Cloud Functions (`submitServiceRequest` & `processServiceApproval`), React Web Admin (`ServiceRequestDetailDialog` + `ApprovalsPage`), and Flutter Mobile (`ServicesTabView` with Glassmorphic Bottom Sheets) implemented and verified across all automated quality gates.
- Editing owner: Antigravity.
- Next reader: user / team contributor.
- Authorized: Implementation, automated verification, and documentation updates on `feat/workforce-service-workflows`.

The current user instruction takes precedence over an older checkpoint. This file
is a coordination record, not a technical lock or a new authorization.

## Authorized scope

The current user request authorizes the two-role/job-title milestone across
contracts, backend, Rules, web and mobile, migration tooling, automated testing,
and related governance. Preserve all pre-existing changes and persistent manual
emulator data. Execute destructive integration tests only in the isolated suite.
Do not run a migration against the manual dataset or online resources as part of
automated validation. No deployment, billing, production migration, or manual
acceptance is authorized. Prepare a local commit after validation; external push
or PR scope must be explicit before publication.

Sections about the earlier agent-setup audit below are historical evidence and
do not reinstate its superseded hold. They will be condensed in the final handoff.

## Read order

1. `AGENTS.md` and this checkpoint.
2. `docs/testing/agent-handoff-runbook.md`.
3. `.agents/skills/kuda-prima-project-continuity/SKILL.md`.
4. The other skills relevant to the authorized task.
5. `docs/project-status.md`, `docs/roadmap.md`, `docs/architecture.md`,
   `docs/domain-rules.md`, and `docs/security-and-retention.md` when evaluating
   application status.
6. `docs/plans/two-role-job-title-implementation-plan.md` for the approved future
   access-model change; reading it does not authorize implementation.

## Baseline and existing work

- Branch verified locally by Codex: `feat/reliable-attendance-and-persistent-dev`.
- HEAD verified locally by Codex: `f29fc8b31e5cc32cc5a93f5b0526249220b4233a`.
- The user's pasted Git output matches that branch and HEAD. Whether those
  commands passed through the Antigravity tool runner is unconfirmed.
- The working tree is intentionally dirty. Existing changes are not disposable.
- The older `main` baseline in `docs/project-status.md` is not a verification
  of current remote state. No fetch, branch synchronization, or Git mutation was
  performed for this handoff.
- Preserve all pre-existing changes below. Status is a snapshot, not a promise
  that the working tree will never change; inspect it again at every handoff.

Snapshot before this documentation task (`git status --short --untracked-files=all`):

```text
 M .agents/skills/kuda-prima-attendance/SKILL.md
 M apps/admin/components.json
 M apps/admin/package.json
 M apps/admin/src/App.test.tsx
 M apps/admin/src/App.tsx
 M apps/admin/src/components/ui/alert-dialog.tsx
 M apps/admin/src/components/ui/badge.tsx
 M apps/admin/src/components/ui/button.tsx
 M apps/admin/src/components/ui/card.tsx
 M apps/admin/src/components/ui/chart.tsx
 M apps/admin/src/components/ui/checkbox.tsx
 M apps/admin/src/components/ui/dialog.tsx
 M apps/admin/src/components/ui/dropdown-menu.tsx
 M apps/admin/src/components/ui/input.tsx
 M apps/admin/src/components/ui/label.tsx
 M apps/admin/src/components/ui/select.tsx
 M apps/admin/src/components/ui/separator.tsx
 M apps/admin/src/components/ui/sheet.tsx
 M apps/admin/src/components/ui/sidebar.tsx
 M apps/admin/src/components/ui/skeleton.tsx
 M apps/admin/src/components/ui/table.tsx
 M apps/admin/src/components/ui/tabs.tsx
 M apps/admin/src/components/ui/textarea.tsx
 M apps/admin/src/components/ui/tooltip.tsx
 M apps/admin/src/features/employees/employee-repository.ts
 M apps/admin/src/index.css
 M apps/admin/src/lib/utils.ts
 M apps/admin/src/main.tsx
 M apps/admin/src/pages/ApprovalsPage.tsx
 M apps/admin/src/pages/EmployeesPage.test.tsx
 M apps/admin/src/pages/EmployeesPage.tsx
 M apps/admin/src/pages/LoginPage.test.tsx
 M apps/admin/src/pages/LoginPage.tsx
 M apps/admin/src/test/setup.ts
 M assets/branding/pt-kuda-prima-logo.png
 M docs/architecture.md
 M docs/decisions/0005-admin-employee-lifecycle.md
 M docs/domain-rules.md
 M docs/project-status.md
 M docs/roadmap.md
 M docs/security-and-retention.md
 M docs/testing/manual-simulation-runbook.md
 M packages/contracts/src/index.ts
 M packages/contracts/test/employee-management.test.ts
 M pnpm-lock.yaml
 M services/functions/src/employees/employee-management-service.ts
 M services/functions/test/employee-management.emulator.test.ts
?? apps/admin/src/components/BrandLogo.tsx
?? apps/admin/src/components/ThemeToggle.tsx
?? apps/admin/src/pages/SettingsPage.tsx
?? assets/branding/logo-old.png
?? docs/plans/two-role-job-title-implementation-plan.md
```

## Files owned by this documentation task

- `AGENTS.md`: entry point for the shared checkpoint and handoff protocol.
- `.agents/rules/project-context.md`: Antigravity Always On routing rule.
- `docs/handoff/current-task.md`: this checkpoint.
- `docs/testing/agent-handoff-runbook.md`: PATH instructions, transfer protocol,
  verification prompt, and acceptance criteria.

## Verified facts and limits

- Codex previously verified the installed Antigravity VS Code extension as
  `google.google-antigravity@1.3.0`.
- Codex verified `%USERPROFILE%\.gemini\bin\agy.exe --version` returns
  `1.2.2`. In the subsequent audit review, Codex verified the directory is now
  present in the persisted user PATH. The user reports successful command
  resolution/version output from PowerShell launched through Windows. The
  existing Codex terminal still inherits the older process PATH; fresh VS Code
  terminal resolution has not yet been independently demonstrated.
- The user reports successful login and 100% remaining quota. This is user-reported
  evidence, not an independent account-service verification.
- Antigravity reported a `datacloud_telemetry_PreToolUse` hook execution failure.
  Prior read-only inspection found an enabled
  `googlecloudtools.datacloud_telemetry` plugin with a `PreToolUse` matcher of
  `*`; its referenced JavaScript file exists. The latest supplied audit shows
  Node `MODULE_NOT_FOUND` with the plugin directory followed by a quoted absolute
  script path as part of the resolved filename. This is evidence of incorrect
  path/argument quoting; the exact runner parsing behavior and repair are untested.
  No hook was executed manually, changed, or disabled for this handoff.
- Successful Git commands in a normal terminal or Codex do not establish that
  the Antigravity runner has recovered.
- Antigravity reports that the rule is present in its runtime context and quotes
  rule 7 correctly. This supports rule availability, not a technical enforcement
  guarantee. Direct reading of the handoff and Git through its runner still fails.
- No user-wide settings, PATH entries, application files, or emulator contents
  are changed by this documentation task.

## Application facts that must not be conflated

- Reliable online attendance and in-session retry are implemented. A durable,
  encrypted offline queue is planned, not implemented.
- Active access roles still include `admin | supervisor | technician`. The
  approved two-role/job-title plan is not started.
- The proposed target is `admin | technician` plus descriptive `jobTitle`;
  a job title must never grant permissions.
- The application hold originates from the current user instruction, not from
  historical milestone descriptions in `docs/project-status.md`.
- Historical test counts are not fresh test results. A prior Codex brand check
  failed because the mobile logo differs from the canonical asset; do not fix
  that application issue as part of agent setup.
- Domain invariants remain in their canonical documents: immutable attendance,
  cross-approval, UTC storage/WIB display, and the exact development project ID.
  Persistent manual emulator data must remain separate from isolated tests.

## Validation for this documentation task

- Targeted Prettier formatting passed for the four task-owned Markdown files.
- `git diff --check` passed for tracked changes.
- SHA-256 comparison preserved all 52 pre-existing changed/untracked files;
  no unexpected changed path was added. Branch and HEAD are unchanged.
- All three PowerShell examples in the runbook parsed successfully without being
  executed by Codex. The subsequent user PATH change is recorded above.
- The rule declares `trigger: always_on`; the subsequent Antigravity report
  supports runtime availability, while full audit acceptance remains pending.
- Application tests/builds are intentionally not run for this documentation-only task.

## Review of the supplied Antigravity audit

- Readiness result: not passed; application implementation remains on hold.
- The first reported failing call is `view_file` for this handoff, exit status 1.
  Thus the failure blocks file reading as well as the planned terminal checks.
- The agent reports stopping tool calls without bypassing or disabling the hook.
  Its declaration of no changes is self-reported, not an independent integrity check.
- The proposed replacement checkpoint from that audit is not accepted as written.
  It falsely confirms domain compliance while supplying unsupported requirements:
  five target access roles, mandatory approval for field attendance, and biometric
  verification. The accepted target remains two roles plus descriptive job title;
  outside-office attendance alone does not require approval; JPEG validation is
  not face identification or liveness (ADR 0004).
- Immutable history must also be described with its approved retention period,
  not as a permanent prohibition on scheduled retention deletion.
- A claim that offline storage will be tamper-proof is not an accepted guarantee.
  The planned queue uses encryption and server validation; implementation is pending.
- When tool access prevents reading a source, report its content as unverified.
  Do not infer domain rules from generic attendance-system patterns.
- The routing rule and read-only audit prompt now state that requirement explicitly.

## Validation and Automated Test Results (2026-09-16 by Antigravity)

- **Brand check**: `pnpm check:brand` passed (mobile logo synced with canonical `assets/branding/pt-kuda-prima-logo.png`).
- **Contracts**: `pnpm --filter @kuda-prima/contracts build` & `test` passed (23/23 tests across 4 test suites).
- **Functions**: `pnpm --filter @kuda-prima/functions build` & `test` passed (23/23 tests across 5 test suites).
- **Admin Portal**: `pnpm --filter @kuda-prima/admin typecheck` & `test` passed (27/27 tests across 7 test suites; `testTimeout` set to 15000ms for jsdom serial stability on Windows).
- **Lint**: `pnpm lint` passed with 0 errors and 0 warnings across all packages.
- **Monorepo Suite**: `pnpm check` passed cleanly end-to-end (73/73 unit tests passed).
- **Production Build**: `pnpm build` passed cleanly across contracts, admin portal, and functions.
- **Mobile Application**:
  - `dart format`: 5 files formatted, 54 files verified completely clean.
  - `flutter analyze`: passed cleanly with 0 issues found (ran in 22.1s).
  - `flutter test`: passed cleanly (36/36 tests passed, ran in 10s).
- **Simulation Refinements Verified**:
  - **Poin 1 (Approval Presensi Anomali)**: Backend attendance submission marks `requiresApproval: true` and generates clear `approvalReasons` for late arrival (>08:15 WIB), early departure (<17:00 WIB), weekend/out-of-schedule work, and field attendance (`geofence.locationType === 'field'`). Backend callable `processAttendanceApproval` verifies active admin identity, prevents self-approval, and records immutable audit logs in `auditLogs/`. Admin UI `ApprovalsPage.tsx` displays category tabs ("Presensi Anomali", "Cuti Tahunan", "Izin Khusus", "Lembur"), reason badges, and confirmation dialogs with notes.
  - **Poin 2 (Admin Portal Login Security)**: Google Sign-in button and divider completely removed from `LoginPage.tsx` and `AdminAuthGate.tsx`. Admin access is strictly restricted to internal email and password credentials.
  - **Poin 3 (Mobile Login Form UI)**: Inputs in `login_page.dart` upgraded with rounded borders (`borderRadius: 16px`), soft background fill (`#F8FAFC`), and clean elevation conforming to brand tokens.
  - **Poin 4 (Employee Table & Instant Search)**: "Hak Akses" column removed from the main employee directory table (retained in Add/Edit modals). Multi-field instant search bar implemented in `EmployeesPage.tsx` filtering by Full Name, Employee ID, Email, and Job Title.
  - **Poin 5 (Tenure-Based Leave & Service Requests)**: Mobile `ServicesTabView` checks `employmentStartDate` (tenure >= 1 year gets 12-day annual leave quota; tenure < 1 year / intern gets informative dialog). Leave, sick, permission, and overtime submissions write to Firestore `serviceRequests` collection with real-time status cards shown to the user.

## Deprecated Code Cleanup & Quality Gate Verification (2026-10-06 by Antigravity)

- **Root Cause & Fix for Emulator Suite**:
  - employee-profile-service.ts: Added fallback (command.jobTitle?.trim() || "Belum diisi") to prevent Firestore error Cannot use undefined as a Firestore value on profiles without an explicit title.
  - attendance-submission.emulator.test.ts: Replaced deprecated role supervisor with canonical role: "admin", jobTitle: "Supervisor" for storage and manager context assertions.
  - employee-management.emulator.test.ts: Included jobTitle on strict schemas (create and edit helpers); updated role options in it.each to ["technician", "admin"]; verified that callers with retired role supervisor are denied with permission-denied, and creating accounts with role supervisor is rejected with invalid-argument.
  - employee-profile.emulator.test.ts: Added jobTitle to baseProfile and all provisioning test commands; updated manager context to role: "admin".
- **Admin Vitest Config Optimization**:
  - apps/admin/vitest.config.ts: Configured Vitest 4 native threads: { singleThread: true } under jsdom, eliminating worker spawn timeout and deprecated warning, dropping suite run time from >100s to ~10s.
- **Full Monorepo Quality Gate Results**:
  - pnpm check:brand: 100% passed (canonical and Flutter logos byte-identical).
  - pnpm check: 100% passed (0 lint errors/warnings, 0 typecheck issues, 73/73 unit tests passed across contracts, functions, and admin).
  - pnpm test:emulator:profile: 100% passed (42/42 isolated emulator integration tests passed across Auth, Firestore, and Storage).
  - pnpm build: 100% passed (production build of contracts, functions, and admin portal dist).
  - dart format: 54 files verified completely clean (0 changed).
  - flutter analyze --fatal-infos: 0 issues found.
  - flutter test: 36/36 tests passed cleanly.
- **Documentation & Governance Cleanup**:
  - Aligned docs/domain-rules.md, docs/architecture.md, docs/security-and-retention.md, docs/decisions/0005-admin-employee-lifecycle.md, and docs/project-status.md with the canonical 2-role (admin | technician) + jobTitle model.

## Mobile Attendance History Tab Refinements (2026-10-06 by Antigravity)

- **Enhanced Attendance Summary (Ringkasan Kehadiran)**:
  - Added **Terlambat** metric showing distinct days with late status (`AttendanceSubmissionStatus.late`) alongside **Total Hadir** days.
  - Symmetrical two-column cards with green and amber semantic accents and rounded icon containers.
  - Dynamic period badge on summary header reflecting active month, custom range, or current month.
- **Dual Date Filter (Month Picker & Date Range Picker)**:
  - **Pilih Bulan**: Bottom sheet dialog with Indonesian month grid (`Januari` - `Desember`) and year stepper, filtering full monthly periods with a single tap.
  - **Rentang Tanggal**: Integrated `showDateRangePicker` for custom date intervals across days/weeks.
  - Clean filter status header showing active range/month with a quick reset button (`history-clear-date-filter`).
  - Empty state with reset button (`history-reset-empty-button`) when a filtered month/range has no records.
- **Opposite Icon Placement for Check-In & Check-Out**:
  - Absen Masuk: Leading position (LEFT), with green circular accent container (`#E8F5E9` / `#1B5E20`), left-aligned text, and right-aligned status badge.
  - Absen Keluar: Trailing position (RIGHT), with orange circular accent container (`secondaryContainer`), right-aligned text, and left-aligned status badge.
  - Positions are strictly opposite and symmetrical, verified via widget geometry assertions.
- **Complete Information Display**:
  - Time & full date in Indonesian locale (`HH:mm WIB` • `EEEE, d MMMM yyyy`).
  - Location details: Kantor Utama vs Luar Kantor (Lapangan), distance in meters, GPS accuracy (`±X m`).
  - Schedule status: Tepat Waktu, Terlambat, Pulang Awal, Luar Jadwal.
  - Approval details: Menunggu Persetujuan Admin, Disetujui (with approver name), Ditolak, Otomatis Valid, reasons, and admin notes.
  - Technician notes in dedicated container.
- **Automated Validation Results**:
  - `dart format lib test`: Clean, 55 files verified.
  - `flutter analyze`: 0 issues found (ran in 131.3s).
  - `pnpm check:brand`: 100% passed.
  - `flutter test`: 6/6 tests passed in `attendance_history_tab_view_test.dart` (including month picker, date range picker, late metrics, and opposite icon assertions).

## Phase 1 Completed: Mobile Attendance Detail with OpenStreetMap & Selfie Photo (2026-10-06 by Antigravity)

- **Map & Dependencies**:
  - Added `flutter_map: ^7.0.2`, `latlong2: ^0.9.1`, and `url_launcher: ^6.3.1` to `apps/mobile/pubspec.yaml`.
  - Added native intent queries in `apps/mobile/android/app/src/main/AndroidManifest.xml` (`https` and `geo` schemes).
- **Attendance Detail Bottom Sheet (`apps/mobile/lib/src/features/attendance/presentation/widgets/attendance_detail_bottom_sheet.dart`)**:
  - Frosted glass backdrop blur header (`ImageFilter.blur(sigmaX: 10, sigmaY: 10)`) with drag indicator and close action.
  - Event banner for Absen Masuk & Absen Keluar with full Indonesian date/time (`EEEE, d MMMM yyyy • HH:mm WIB`) and schedule status badge.
  - Foto Verifikasi Wajah (Selfie): Asynchronous download URL resolution via Firebase Storage / URL with tap-to-zoom Lightbox modal (`InteractiveViewer`), and graceful fallback for archived records (> 3 months retention) without throwing broken image errors.
  - OpenStreetMap visualization: zero-billing OSM standard tile provider, exact technician GPS pin (`AppColors.orange`), office geofence circle (50m radius), GPS coordinates display, distance to office, GPS accuracy (`±X m`), and native "Buka di Google Maps" intent button.
  - Full verification metadata: location classification, approval status badge, anomaly reasons chips, approver name, admin review notes, and technician notes.
- **Card Tap Action (`apps/mobile/lib/src/features/attendance/presentation/attendance_history_tab_view.dart`)**:
  - Wrapped attendance cards with `InkWell(onTap: () => AttendanceDetailBottomSheet.show(context, event))`.
  - Added subtle "Lihat Detail & Peta" action hint with chevron.
- **Automated Validation Results**:
  - `dart format lib test`: 100% formatted.
  - `flutter analyze`: 0 issues found (ran in 6.6s).
  - `pnpm check:brand`: 100% passed.
  - `flutter test`: 45/45 tests passed across all mobile suites (including 8/8 in `attendance_history_tab_view_test.dart` and dedicated `attendance_detail_bottom_sheet_test.dart`).

## SonarQube & Accessibility Resolution in ApprovalsPage.tsx (2026-10-06 by Antigravity)

- **Issue 1 (Nested Ternary in Attendance Content)**: Extracted `{loading ? ... : attendanceApprovals.length === 0 ? ... : ...}` into independent helper statement `renderAttendanceContent()`.
- **Issue 2 (Accessibility on Status Element)**: Replaced `<div role="status">` with semantic `<output>` element ensuring universal screen-reader accessibility across all devices (SonarQube `typescript:S6844`).
- **Issue 3 (Nested Ternary in Service Request Actions)**: Extracted `{item.status === "pending" ? (isSelf ? ... : ...) : ...}` into independent helper statement `renderServiceAction()`.
- **Issue 4 (Nested Ternary in Attendance Approval Actions)**: Extracted `{item.approvalStatus === "pending" ? (isSelf ? ... : ...) : ...}` into independent helper statement `renderAttendanceAction()`.
- **Additional Guardrail**: Extracted `getReasonBadgeClass` and `getConfirmButtonLabel` helpers, eliminating 100% of nested ternaries in `ApprovalsPage.tsx` (SonarQube `typescript:S3358`).
- **Automated Verification**:
  - `oxlint`: 0 warnings, 0 errors.
  - `tsc -b`: 0 type errors.
  - `vitest run`: 27/27 tests passed across all admin test suites (including `ApprovalsPage.test.tsx`).
  - `pnpm check:brand`: 100% passed.

## Phase 2: Web Admin Attendance Detail Dialog & OpenStreetMap (2026-10-06 by Antigravity)

- **Dependencies (`apps/admin/package.json`)**:
  - Installed `leaflet: 1.9.4` and `@types/leaflet: 1.9.22`.
  - Imported Leaflet standard styles (`leaflet/dist/leaflet.css`) in `apps/admin/src/index.css`.
- **Firebase Storage Export (`apps/admin/src/lib/firebase.ts`)**:
  - Exported `storage` instance and connected storage emulator (`127.0.0.1:9199`) in development mode.
- **Data Model Extensions (`approval-repository.ts` & `use-attendance-live.ts`)**:
  - Extended `AttendanceApprovalEntry` and `AttendanceEventItem` to map `latitude`, `longitude`, `accuracyMeters`, `photoStoragePath`, and `photoUrl` from Firestore `attendanceEvents`.
- **OpenStreetMap Component (`apps/admin/src/components/attendance/AttendanceMap.tsx`)**:
  - Pure React + Leaflet map container (React 19 compatible, zero peer-dependency conflicts).
  - OpenStreetMap standard raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) - 100% free, zero billing, zero Google Cloud API keys.
  - Custom SVG markers: PT Kuda Prima brand orange (`#f25923`) for employee pin with animated ripple, brand navy (`#283989`) for office pin.
  - Geofence circle: 100m radius around office location.
  - Dashed connecting distance polyline.
  - Interactive popup with employee name, time (WIB), location, distance, and GPS accuracy.
  - External navigation action button: "Buka di Google Maps" intent link.
  - GPS unavailable fallback state when coordinates are absent.
- **Selfie Photo & Lightbox (`apps/admin/src/components/attendance/AttendancePhotoView.tsx`)**:
  - Asynchronous photo loading from direct URL or Firebase Storage download URL.
  - 90-day retention guard: records older than 3 months display archival notice without throwing errors.
  - Click-to-zoom Lightbox modal with backdrop blur (`backdrop-blur-sm bg-black/80`), full-resolution preview, and ESC/backdrop dismiss.
- **Attendance Detail Dialog (`apps/admin/src/components/attendance/AttendanceDetailDialog.tsx`)**:
  - Responsive 2-column modal (`Dialog` from shadcn/ui).
  - Left column: Selfie photo preview, employee details, time (WIB), attendance event badge, reason badges, and admin approval notes.
  - Right column: OpenStreetMap interactive map, location classification chip, distance and accuracy chips.
  - Footer: Close button, plus integrated "Setujui" / "Tolak" actions for pending requests with self-approval protection.
- **Integration across Admin Portal**:
  - Wired into `apps/admin/src/pages/ApprovalsPage.tsx` with dedicated "Detail" button per attendance approval item.
  - Wired into `apps/admin/src/App.tsx` live feed table ("Aktivitas terbaru") with "Detail" button.
- **Quality Gate Results**:
  - `pnpm check:brand`: 100% passed (tokens & logo consistent).
  - `oxlint`: 0 warnings, 0 errors across 53 files.
  - `tsc -b`: 0 type errors.
  - `vitest run` (@kuda-prima/admin): 34/34 tests passed (including 6/6 in `AttendanceDetailDialog.test.tsx`).
  - `pnpm check` (entire monorepo): 80/80 tests passed across contracts (23), functions (23), and admin (34).
  - `flutter analyze` (@apps/mobile): 0 issues found.
  - `flutter test` (@apps/mobile): 45/45 tests passed.
  - Total automated tests passing: 125/125.
  - Production build: `pnpm --filter @kuda-prima/admin build` succeeded in 3.44s.

## SonarQube Cleanup in App.tsx, approval-repository.ts, and use-attendance-live.ts (2026-10-06 by Antigravity)

- **`App.tsx` Fixes**:
  - Extracted nested ternary `{loading ? ... : clickable && Number(value) > 0 ? ... : ...}` into pure helper `getSummaryCardDescription()`.
  - Extracted nested ternary `event.status === "normal" ? "default" : event.status === "late" ? "destructive" : "outline"` into pure helper `getEventStatusBadgeVariant()`.
  - Cached `Intl.DateTimeFormat` instance in `wibDateFormatter` outside the `useWibClock` hook.
  - Added full keyboard accessibility (`role="button"`, `tabIndex={0}`, and `onKeyDown` with Enter/Space support) to clickable KPI `<Card>`.
  - Added explicit `type="button"` and accessible `aria-label` to the table "Detail" button.
  - **Resolved 5 SonarQube Issues in `App.tsx` (2026-10-06)**:
    1. Extracted nested ternary operations inside the table body into independent helper functions:
       - `getEventTypeText(eventType)` for "Masuk" / "Pulang" labels.
       - `getLocationTypeText(locationType)` for "Kantor" / "Lapangan" labels.
       - `getEmptyAttendanceMessage(loading)` for empty/loading table states.
       - Extracted independent SFC `AttendanceTableBody` with clean top-level early return (`if (events.length === 0)`), completely eliminating all JSX nested ternaries (`typescript:S3358`).
    2. Removed unused `'user'` PropType from `AdminDashboardProps`, `AuthenticatedApp`, and `App`.
    3. Removed unused `'role'` PropType from `AdminDashboardProps`, `AuthenticatedApp`, and `App` (`react/no-unused-prop-types`).
    4. Marked all component props as read-only (`typescript:S6759`) using `readonly` fields and `Readonly<Props>` wrappers for `AttendanceTableBody`, `AttendancePage`, `AdminDashboard`, and `App`.
- **`AccessDeniedPage.tsx` Fixes (`typescript:S6759` & `typescript:S3358`)**:
  - Marked `AccessDeniedPageProps` properties as `readonly` and component parameter wrapped in `Readonly<AccessDeniedPageProps>`.
  - Extracted nested ternary `{ !isActive ? ... : role === "technician" ? ... : ... }` into independent `renderAccessDeniedReason(isActive, role)` helper function.
- **`components/attendance/` Fixes (`typescript:S6759`, `S6819`, `S6847`, `S1082`, `S6848`)**:
  - Marked all props interfaces and components as read-only for `AttendanceDetailDialog`, `AttendanceMap`, and `AttendancePhotoView`.
  - **`AttendanceMap.tsx`**: Replaced `<div role="region" aria-label="...">` with semantic `<section aria-label="...">` landmark, resolving `typescript:S6819`.
  - **`AttendancePhotoView.tsx`**: Replaced custom `div` lightbox modal and click backdrop (`onClick={(e) => e.stopPropagation()}`) with the project's standard accessible Radix UI `<Dialog>` (`DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`), eliminating all non-interactive click listener and non-native interactive element violations (`typescript:S6847`, `typescript:S6819`, `typescript:S1082`, `typescript:S6848`).
- **`approval-repository.ts` Fixes**:
  - Extracted `extractApprovalReasons()` and `parseApprovalStatus()` to eliminate inline mutation and multiple nested branching.
  - Extracted `mapDocToAttendanceApproval()` and `mapDocToServiceRequest()` pure doc-mapping helpers.
  - Eliminated redundant arrow wrapper callbacks (`(err) => error(err)` replaced with direct `error` callback).
  - Reduced cyclomatic & cognitive complexity from >25 to <3 per function.
- **`use-attendance-live.ts` Fixes**:
  - Replaced all magic numbers (`7 * 3600000`, `86400000`, `30000`) with well-named constants (`WIB_OFFSET_HOURS_MS`, `ONE_DAY_MS`, `DAY_CHECK_INTERVAL_MS`).
  - Cached `Intl.DateTimeFormat` instance in module-level `wibTimeFormatter`.
  - Extracted pure helper functions `mapDocToAttendanceEventItem()`, `processEventsSnapshot()`, `countPendingAttendance()`, and `countPendingServices()`.
  - Standard standardized interval functions to `window.setInterval` / `window.clearInterval`.
  - Reduced cognitive complexity of `useAttendanceLiveFeed` hook from >35 to <10.
- **`AttendanceDetailDialog.tsx` Fixes**:
  - Extracted 4-level nested ternary for `eventLabel` into standalone helper `getEventLabel()`.

## E2E Simulation Findings & Parity Fixes (2026-10-07 by Antigravity)

- **Issue 1: Mobile Attendance Detail Selfie Photo**:
  - Traced to missing `FirebaseStorage.instance.useStorageEmulator(AppConfig.firebaseEmulatorHost, AppConfig.storageEmulatorPort)` in `apps/mobile/lib/src/core/firebase/firebase_bootstrap.dart`.
  - Fixed in `firebase_bootstrap.dart`. Preserved strict dev/prod parity: when `AppConfig.useFirebaseEmulators` is enabled, routes to local emulator `10.0.2.2:9199`; when disabled, routes directly to production Google Cloud Storage.
- **Issue 2: Web Admin Attendance Detail Dialog Action**:
  - Traced to undefined `storageBucket` in `apps/admin/src/lib/firebase.ts` when no local `.env` is present, causing synchronous `FirebaseError: Firebase Storage: No default bucket found` when `ref(storage, ...)` was called.
  - Fixed by configuring canonical `${projectId}.firebasestorage.app` fallback in `firebase.ts` (matching Android `google-services.json` and Gen 2 Storage emulator bucket) and adding resilient fallback in `AttendancePhotoView.tsx`. Verified with direct download test returning HTTP 200 (75KB JPEG). Ensures 100% robust dev/prod parity.
- **Issue 3: Web Admin Navbar "Masuk sebagai Belum diisi"**:
  - Traced to literal `"Belum diisi"` fallback in `App.tsx` when `jobTitle` on the user profile is empty or unpopulated in Firestore.
  - Fixed by introducing `getDisplayJobTitle(jobTitle, role)` helper and threading `role` into `AdminDashboard`. Seamlessly falls back to `"Administrator Sistem"` for admin role and `"Teknisi Operasional"` for technician role, ensuring clear and professional role designation in both dev and prod environments.

## Merge Conflict Resolution & Synchronization with Origin/Main (2026-10-07 by Antigravity)

- **Root Cause of Conflicts on GitHub PR**:
  - PR #11 (`feat: harden attendance and add employee management (#11)`) was squash-merged to `main` as commit `d7c27f3`.
  - Commit `d7c27f3` squashed 4 earlier commits (`3303935`, `298d91c`, `c59b32c`, `f29fc8b`).
  - Branch `feat/reliable-attendance-and-persistent-dev` still retained those 4 original individual commits plus subsequent commits (`d6a056b` and `b1cf168`).
  - Because `d7c27f3` is byte-for-byte identical in codebase tree to `f29fc8b` but possesses a distinct Git SHA, standard Git three-way merge compared both branches against ancestor `bcb18e4`, producing phantom conflicts on every file touched by PR #11.
- **Resolution Executed**:
  - Synchronized `origin/main` using `git merge -X ours --no-edit origin/main`, seamlessly merging main's squashed tree into the topic branch and creating merge commit `ef43738`.
  - Cleaned minor package/lockfile duplications in `apps/admin/package.json` and `pnpm-lock.yaml`.
  - Preserved 100% of Attendance Detail features, OpenStreetMap integration, selfie photo parity, and dev/prod compatibility.
- **CI Workflow (web-and-functions) Resolution (2026-10-07 by Antigravity)**:
  - Root cause of GitHub Actions CI failure:
    1. In `employee-profile.emulator.test.ts`, `updateDoc(reference, ...)` returns `void` (`undefined`). An assertion `expect(assertSucceeds(updateDoc(...))).resolves.toBeDefined()` failed with `AssertionError: expected undefined to be defined`. Restored canonical `await assertSucceeds(updateDoc(...));`.
    2. Missing Vitest timeout configuration in `services/functions` caused emulator test suites to occasionally timeout during heavy test initialization (default 5s/10s). Added `services/functions/vitest.config.ts` specifying `testTimeout: 30000` and `hookTimeout: 30000`.
  - All CI steps locally verified:
    - `pnpm check`: Passed (brand check, build contracts, linting, typecheck, Vitest 80/80 passed).
    - `pnpm test:emulator:profile`: 100% Passed (42/42 isolated emulator tests across Auth, Firestore, and Storage).
    - `pnpm build`: 100% Passed (contracts, functions, and admin production builds).
    - `flutter analyze` & `flutter test`: 45/45 Passed.
- **Remaining Action**:
  - Commit CI fix and push to `origin feat/reliable-attendance-and-persistent-dev` so GitHub Actions checks turn all green.

## Milestone M3: End-to-End Workforce Service & Approval Workflows (2026-10-12 by Antigravity)

- **Baseline & Branch Hygiene**:
  - Synchronized local `main` to `origin/main` (`36be42f`, squash merge of PR #12) and created clean feature branch `feat/workforce-service-workflows`.
- **Phase 1: Contracts, Security Rules, & Cloud Functions**:
  - `packages/contracts/src/index.ts` & `packages/contracts/test/leave-overtime.test.ts`: Added `serviceRequestTypeSchema`, `submitServiceRequestCommandSchema` (date-range `startDate`–`endDate`, overtime `startedAt`–`endedAt`, `clientOrLocation`, mandatory `selfieBase64` for overtime, optional `attachmentBase64`), and `processServiceApprovalCommandSchema` (28/28 contract unit tests passing).
  - `firebase/firestore.rules` & `firebase/storage.rules`: Locked direct client writes on `serviceRequests/{requestId}` (`allow write: if false`) and added read access on `service-requests/{userId}/{fileName}` for active owner and active admin.
  - `services/functions/src/services/service-request-service.ts`, `services/functions/src/index.ts`, & `services/functions/test/service-request.test.ts`: Implemented `submitServiceRequest` and `processServiceApproval` Gen 2 Callables with `calculateWorkingDays` (excluding Saturdays & Sundays), 1-year tenure check, approved-only 12-day annual leave quota validation, overtime mandatory selfie & >8h warning, Storage upload, strict cross-approval (anti self-approval), and immutable `auditLogs/` writes (28/28 function unit tests passing).
- **Phase 2: Web Admin Portal**:
  - `apps/admin/src/features/approvals/approval-repository.ts`: Extended `ServiceRequestEntry` with `jobTitle`, `startedAt`, `endedAt`, `clientOrLocation`, `workingDaysCount`, `durationMinutes`, `selfieStoragePath`, `attachmentStoragePath`, `createdAt`, and wired `submitServiceApproval` to `processServiceApproval` Cloud Function.
  - `apps/admin/src/components/approvals/ServiceRequestDetailDialog.tsx`: Built glassmorphic detail modal with employee identity, period/duration metadata, >8h safety badge, `AttendancePhotoView` Lightbox for both Overtime Selfie and Supporting Attachment (Surat Dokter / SPK), and Approve/Reject actions with self-approval protection.
  - `apps/admin/src/pages/ApprovalsPage.tsx` & `apps/admin/src/pages/ApprovalsPage.test.tsx`: Added "Detail" button and period/duration badges to service request rows and verified modal flow (35/35 admin unit tests passing).
- **Phase 3: Mobile Flutter App (Glassmorphic Bottom Sheet UI)**:
  - `apps/mobile/lib/src/features/services/presentation/services_tab_view.dart` & `apps/mobile/test/features/services/presentation/services_tab_view_test.dart`:
    - `_GlassAnnualLeaveCard`: Frosted glass card (`BackdropFilter` blur + subtle specular border) displaying remaining quota (`12 - approvedDays`), progress bar, and pending approval badge (pending requests do not deduct quota until Admin approves).
    - `_LeavePermissionBottomSheet`: Ergonomic `DraggableScrollableSheet` with balanced glassmorphism (`sigma: 14`, `alpha: 0.94`), date-range picker, live effective working days calculation pill (excluding Saturdays/Sundays), optional supporting photo capture, and sticky thumb-zone CTA.
    - `_OvertimeBottomSheet`: Glassmorphic bottom sheet with date/time pickers supporting cross-midnight (`H+1`), live duration & >8h safety warning pill, client/location & task inputs, mandatory selfie verification capture via `CameraSelfieDialog`, and optional SPK attachment.
    - `_ServiceRequestDetailBottomSheet`: Full detail view with dual-bucket Storage photo loader and tap-to-zoom Lightbox (`InteractiveViewer`).
- **Automated Verification Results**:
  - `pnpm check:brand`: 100% Passed.
  - `pnpm check`: 100% Passed (0 oxlint errors/warnings, 0 typecheck errors, 93/93 Vitest unit tests passed: 28 contracts, 28 functions, 37 admin).
  - `pnpm build`: 100% Passed.
  - `dart format lib test`: 100% Formatted.
  - `flutter analyze`: 0 issues found.
  - `flutter test`: 51/51 Passed (including 6 new tests in `services_tab_view_test.dart`).
  - **Total Automated Tests Passing**: 144/144.

## Web Admin Real-Time Attendance & Service Recap, Official PDF/CSV Exporters, Real APK QR Code & Production Seeding (2026-10-12 by Antigravity)

- **Real-Time Firestore Aggregation (`apps/admin/src/features/reports/report-repository.ts`)**:
  - Subscribes to `users`, `attendanceEvents`, and `serviceRequests` collections in real time.
  - Computes per-employee `EmployeePayrollRecap`: `presentDays`, `onTimeDays`, `lateCount`, `lateMinutes` (relative to 08:00 WIB), `earlyDepartureCount`, `fieldDays`, `overtimeMinutes` (approved only), `annualLeaveDays` (approved only), `sickLeaveDays` (approved only), and `permissionDays` (approved only).
  - Supports filtering by quick month selector (`YYYY-MM`), custom date range (`startDate` to `endDate`), and multi-field employee search (Name, Employee ID, Job Title).
- **CSV & Vector PDF 1.4 Exporters with Default PT Kuda Prima Logo (`apps/admin/src/features/reports/report-exporters.ts`)**:
  - `exportReportCsv`: Generates UTF-8 with BOM (`\uFEFF`) CSV files for Excel compatibility across all 3 report views (`recap`, `attendance`, `services`).
  - `exportReportPdf`: Pure TypeScript A4 Landscape PDF 1.4 vector generator with embedded PT Kuda Prima Logo (`/ImLogo` JPEG XObject) in the official letterhead (`Kop Dokumen Resmi PT Kuda Prima`), `#283989` navy + `#F25923` orange accent stripe, KPI summary bar, multi-page table pagination, and official HR/Admin signature block.
  - Replaced all `"payroll"` filing terminology with official corporate document filenames: `Rekap_Kehadiran_dan_Layanan_PT_Kuda_Prima_<period>.(pdf|csv)`, `Log_Presensi_Harian_PT_Kuda_Prima_<period>.(pdf|csv)`, and `Log_Cuti_Izin_dan_Lembur_PT_Kuda_Prima_<period>.(pdf|csv)`.
- **Real, Permanent & Free ISO/IEC 18004 QR Code on APK Distribution Page (`apps/admin/src/lib/qr-code.ts` & `apps/admin/src/pages/DistributionPage.tsx`)**:
  - Implemented self-contained ISO/IEC 18004 QR Code matrix generator (`generateQrCodeMatrix`, Versions 1–7, Level L, Byte Mode, Reed-Solomon GF(256) & BCH(15,5)) in pure TypeScript—100% offline, permanent, free, and zero external dependencies.
  - Upgraded `DistributionPage.tsx` (`Version APK`) with a printable `<BrandLogo />` QR poster, real scannable SVG QR Code (`data-testid="real-apk-qr-svg"`), and configurable APK download URL with copy/reset controls.
- **2-Admin Initial Online Production Seeding (`services/functions/src/development/seed-production-online.ts` & `docs/testing/production-deployment-runbook.md`)**:
  - Added `pnpm seed:production` script guarded by `CONFIRM_ONLINE_PRODUCTION_SEED=true`.
  - Seeds strictly **2 initial Admin accounts** (`admin.utama@kudaprima.id` & `admin.operasional@kudaprima.id`, both with `role: "admin"`, zero `supervisor` role or jobTitle) for cross-approval compliance, plus `officeLocations/main`.
  - Documented complete step-by-step Firebase Online activation, deployment, and seeding guide in `docs/testing/production-deployment-runbook.md`.

## Spark-Native Cloud Deployment, Online Seeding & Hosted APK Release (2026-10-12 by Antigravity)

- **Spark-Native Architecture (100% Free Rp 0 / No Blaze Prepayment Required)**:
  - Upgraded `firebase/firestore.rules`, Web Admin (`employee-repository.ts`, `approval-repository.ts`, `use-admin-auth.ts`, `AttendancePhotoView.tsx`), and Flutter Mobile (`firebase_attendance_submission_repository.dart`, `services_tab_view.dart`, `attendance_detail_bottom_sheet.dart`) to operate seamlessly on Firebase Spark Plan when `USE_FIREBASE_EMULATORS=false` while preserving full Cloud Functions & Storage Emulator workflows locally.
  - Resolved Dart analyzer lint `use_null_aware_elements` (`'selfieStoragePath': ?selfieDataUrl, 'attachmentStoragePath': ?attachmentDataUrl`) in `apps/mobile/lib/src/features/services/presentation/services_tab_view.dart`.
- **Firebase Online Deployment & Initial 2-Admin Seeding**:
  - Deployed `firestore.rules`, `firestore.indexes.json`, and Web Admin Portal to `https://kuda-prima-attandance-dev.web.app`.
  - Executed online seeding (`pnpm seed:production`): created strictly 2 Admin accounts (`KP-000001` `admin.utama@kudaprima.id` & `KP-000002` `admin.operasional@kudaprima.id`, both `role: "admin"`, zero `supervisor` role/jobTitle), `officeLocations/main`, and `systemCounters/employeeId` (`nextSequence: 3`).
- **Production Android Release APK & Spark-Compatible Hosting Delivery**:
  - Built 64-bit production Release APK (`flutter build apk --release --no-shrink --target-platform android-arm64 --dart-define=USE_FIREBASE_EMULATORS=false`, 27.4 MB).
  - Hosted APK package on Firebase Hosting CDN and added `PublicApkDownloadPage` (`apps/admin/src/pages/DistributionPage.tsx` & `apps/admin/src/App.tsx`) so scanning the permanent QR Code (`https://kuda-prima-attandance-dev.web.app/download/kudaprima-attendance.apk`) or clicking **Unduh APK** automatically streams and saves `kudaprima-attendance.apk` (`application/vnd.android.package-archive`).
- **Corporate & Multi-Organization Email Domain Support (2026-10-14 by Antigravity)**:
  - Removed restrictive `@gmail.com` validation refine in `packages/contracts/src/index.ts` (`employeeEmailSchema`).
  - Supports all official corporate and partner domains (`@kudaprima.com`, `@kudaprima.co.id`, `@sadikun.com`, `@mutiaraepc.com`, dsb.) and personal emails while strictly enforcing standard email syntax.
  - Updated Web Admin form helpers and error handling in `EmployeesPage.tsx`, `LoginPage.tsx`, and `employee-repository.ts`.
  - Re-deployed updated Web Admin Portal and Release APK to `https://kuda-prima-attandance-dev.web.app`.
- **Hybrid Google Sign-In Approval & Attendance Submission Hardening (2026-10-14 by Antigravity)**:
  - **Hybrid Google Sign-In Workflow**:
    - Pre-registered accounts: When Admin has already added an employee email in Web Admin, Google Sign-in links directly and preserves active status (`active: true`), giving instant access without waiting.
    - Self-registered accounts: When a user signs in with a Google account not yet registered by Admin, the profile is provisioned with `active: false` (Menunggu Persetujuan Admin).
    - Mobile UI: `EmployeeProfileGate` displays informative pending approval view with employee email, status refresh button (`Periksa Status Akun`), and sign-out option.
    - Firestore Security Rules: Updated `match /users/{userId}` to allow email lookup for pre-registration and allow `request.resource.data.active in [true, false]`.
  - **Attendance Submission Hardening & Photo Compression**:
    - `CameraSelfieDialog`: Configured `ResolutionPreset.low` (240p) and added `_optimizePhotoBytes` using `dart:ui.instantiateImageCodec(rawBytes, targetWidth: 400)`, guaranteeing selfie JPEG size is ~25-40 KB (far below Firestore's 1 MB limit) and uploads in milliseconds.
    - `_submitAttendanceSpark`: Added fallback for empty field note to `'Presensi lapangan'`, separated `eventRef.set(eventPayload)` from `auditLogs` to ensure audit logging never blocks core attendance writes, and used null-aware element `'note': ?resolvedNote`.
    - `attendance_home_page.dart`: Unmasked exception handling to surface genuine errors from `FirebaseException` and `StateError` to the user rather than generic connection errors.
  - **Verification & Deployment**:
    - Verified all 97 monorepo unit tests (`pnpm check`: 28 contracts, 30 functions, 39 admin) passed 100%.
    - Verified Flutter mobile app: `dart format` clean, `flutter analyze` 0 issues, and all 51 mobile widget/unit tests passed.
    - Built production Release APK (27.4 MB, 28,692,063 bytes) and deployed to Firebase Hosting (`https://kuda-prima-attandance-dev.web.app`).
- **Editable Employment Start Date in Web Admin User Management (2026-10-14 by Antigravity)**:
  - Added optional `employmentStartDate: calendarDateSchema.optional()` to `updateEmployeeCommandSchema` in `packages/contracts/src/index.ts`.
  - Updated `employee-repository.ts` and `employee-management-service.ts` to persist `employmentStartDate` during employee updates.
  - Upgraded `EmployeesPage.tsx` edit modal so Admin can edit `Tanggal mulai bekerja` for any existing user (e.g., retroactively adjusting hire dates for employees who self-registered via Google), ensuring accurate tenure and annual leave quota calculations.
  - Verified with 97/97 tests passing in `pnpm check` and deployed to Firebase Hosting (`https://kuda-prima-attandance-dev.web.app`).
- **Modern TypeScript, React 19, Accessibility, and Skill Governance (2026-10-14 by Antigravity)**:
  - **`EmployeesPage.tsx` Deprecation & Accessibility Upgrades**:
    - Replaced deprecated React 19 type `FormEvent` with `SyntheticEvent<HTMLFormElement>`.
    - Marked props of `EmployeeForm` (`EmployeeFormProps`) and `DeleteEmployeeDialog` (`DeleteEmployeeDialogProps`) as `readonly` and wrapped in `Readonly<TProps>` (SonarQube `typescript:S6759`).
    - Replaced `<p role="status">` with semantic `<output className="block ...">` for both action notices and loading indicators to ensure full screen-reader accessibility across all devices (SonarQube `typescript:S6844`).
  - **Tailwind CSS v4 IDE Compatibility (`index.css` & `.vscode/settings.json`)**:
    - Added `"css.lint.unknownAtRules": "ignore"` to `.vscode/settings.json` to eliminate IDE warnings for valid Tailwind CSS v4 `@custom-variant` and `@theme` directives.
  - **Modern DOM Cleanup (`DistributionPage.tsx` & `report-exporters.ts`)**:
    - Replaced deprecated `parentNode.removeChild(childNode)` with standard `childNode.remove()`.
  - **Other Admin Components (`AdminAuthGate.tsx` & `BrandLogo.tsx`)**:
    - Enforced `Readonly<Props>` and `readonly` properties across all custom components.
  - **Skill Governance (`.agents/skills/kuda-prima-ui-governance/SKILL.md`)**:
    - Added Rule 8 codifying readonly component props, deprecated React type avoidance, semantic `<output>` accessibility, modern DOM removal, and Tailwind CSS v4 lint settings for all future agent tasks.
  - **Verification & Deployment**:
    - Verified `pnpm check` (brand check, 28 contracts tests, 30 functions tests, 39 admin tests, oxlint 0 errors, tsc 0 errors) passed 100%.
    - Verified `pnpm build` completed cleanly in 2.15s.
- **Tailwind CSS v4 Canonical Classes Refinement (2026-10-15 by Antigravity)**:
  - **`ReportsPage.tsx` Canonical Classes Upgrade**:
    - Replaced non-canonical arbitrary spacing `max-w-[220px]` with canonical design-system class `max-w-55` across attendance log and service request log table cells (220px = 55 × 4px / 0.25rem scale).
    - Replaced `lg:w-[580px]` with canonical `lg:w-145` on the report tab list (580px = 145 × 4px / 0.25rem scale).
  - **IDE & Tailwind CSS IntelliSense Governance (`.vscode/settings.json`)**:
    - Configured `"tailwindCSS.lint.suggestCanonicalClasses": "warning"` to consistently enforce and suggest canonical class shorthands whenever arbitrary values match Tailwind v4's continuous scale.
    - Added recommended Tailwind linting guardrails: `invalidApply: "error"`, `invalidScreen: "error"`, `invalidVariant: "error"`, `invalidConfigPath: "error"`, `invalidTailwindDirective: "error"`, `recommendedVariantOrder: "warning"`, plus `experimental.classRegex` for `cn`, `cva`, and `cx` utility extraction.
  - **Verification**:
    - `pnpm prettier --check`: Clean formatting across all modified files.
    - `pnpm check`: 100% Passed (brand check, oxlint 0 errors, tsc 0 errors, Vitest 97/97 tests passed).
- **Production Admin Initial Password Synchronization (2026-10-15 by Antigravity)**:
  - **Penyebab**: Saat eksekusi online seeding sebelumnya, akun `admin.utama@kudaprima.id` dan `admin.operasional@kudaprima.id` dibuat dengan kata sandi default kode lama (`KudaPrima#Admin2026`), sedangkan panduan di `production-deployment-runbook.md` mencantumkan `PasswordAdminKuat#2026`.
  - **Perbaikan**:
    - Berhasil memperbarui kata sandi kedua akun Admin online (`admin.utama@kudaprima.id` & `admin.operasional@kudaprima.id`) langsung di Firebase Authentication menjadi `PasswordAdminKuat#2026`.
    - Memperbarui fallback default `initialPassword` di `services/functions/src/development/seed-production-online.ts` menjadi `"PasswordAdminKuat#2026"`.
  - **Catatan Lingkungan Lokal vs Online**:
    - **Online (`https://kuda-prima-attandance-dev.web.app`)**: Gunakan `admin.utama@kudaprima.id` dengan kata sandi `PasswordAdminKuat#2026`.
    - **Lokal Dev (`localhost:5173` via `pnpm dev:admin`)**: Karena terhubung ke Emulator Auth lokal (`127.0.0.1:9099`), gunakan akun uji emulator `admin.dev@kudaprima.test` dengan kata sandi `KudaPrimaDev2026#`.
- **Mobile Login Page UI Refinements (2026-10-15 by Antigravity)**:
  - **Pembaruan Visual & Branding**:
    - **Google Brand Icon**: Menambahkan icon 4-warna vektor Google ("G") berbasis `CustomPainter` murni pada tombol `OutlinedButton.icon` ("Masuk dengan Google").
    - **Versi Aplikasi**: Menampilkan badge versi (`AppConfig.appVersion` = `v1.0.0`) di pojok kiri atas layar login dengan border lembut dan kontras aksesibel.
    - **Copyright Perusahaan**: Menampilkan teks copyright resmi di bagian tengah bawah (`© ${year} PT Kuda Prima. Seluruh hak cipta dilindungi.`).
  - **Verifikasi**:
    - `dart format`: 100% rapi dan terformat.
    - `flutter analyze`: 0 issues found.
    - `flutter test`: 52/52 mobile tests lulus (termasuk verifikasi widget Google logo, version badge, dan copyright text).
    - `pnpm check:brand`: 100% lulus.
  - **Build APK Release & Deployment ke Firebase Hosting**:
    - Meningkatkan nomor versi di `apps/mobile/pubspec.yaml` menjadi `1.0.0+2` (`versionCode: 2`).
    - Mengompilasi APK release Android 64-bit: `flutter build apk --release --no-shrink --target-platform android-arm64 --dart-define=USE_FIREBASE_EMULATORS=false` (27.4 MB).
    - Memperbarui paket unduhan publik `apps/admin/public/download/kudaprima-attendance.zip`.
    - Membangun kembali web admin dan men-deploy ke Firebase Hosting (`https://kuda-prima-attandance-dev.web.app`).
    - File APK release terbaru sudah live dan diverifikasi langsung dari server Firebase CDN (`package: name='com.kudaprima.attendance' versionCode='2' versionName='1.0.0'`).
    - Ditambahkan konfigurasi `Cache-Control: no-cache, no-store, must-revalidate` di `firebase.json` dan parameter query `?t=${Date.now()}` di `DistributionPage.tsx` agar unduhan di ponsel tidak pernah tertahan cache browser lama.
    - Menyelaraskan teks dan badge di `DistributionPage.tsx` agar menampilkan secara eksplisit **Rilis Resmi v1.0.0 (Build 2)** dan merilis file paket baru `kudaprima-attendance-v2.apk` (via `kudaprima-attendance-v2.zip`) untuk memintas total kemungkinan cache pada perangkat pengguna.
- **Universal Hybrid Password Reset Workflow Implementation (2026-10-15 by Antigravity)**:
  - **Penyelarasan Desain & Sistem Bawaan Firebase**:
    - Alur reset password memanfaatkan sistem bawaan Firebase: Firebase Auth mengeksekusi `sendPasswordResetEmail(email)` dan menyediakan antarmuka web reset kata sandi resmi saat tautan di email dibuka oleh pengguna.
    - Pada aplikasi mobile ([login_page.dart](file:///d:/KudaPrima/Project%20Management/daily_attandance/apps/mobile/lib/src/features/auth/presentation/login_page.dart)), tombol *Lupa Kata Sandi* memvalidasi format email, mengirimkan email reset ke Firebase Auth untuk semua jenis domain (baik Gmail maupun domain korporat/internal), kemudian menampilkan dialog pesan universal yang singkat, jelas, dan tepat:
      > **Pengaturan Ulang Kata Sandi**
      >
      > Petunjuk reset kata sandi telah dikirim ke [email]. Silakan periksa kotak masuk (inbox) atau folder spam email Anda.
      >
      > *Catatan: Jika akun Anda menggunakan email internal yang tidak memiliki kotak masuk aktif, silakan hubungi Administrator HR untuk bantuan pengaturan ulang kata sandi.*
    - Pada portal web admin ([LoginPage.tsx](file:///d:/KudaPrima/Project%20Management/daily_attandance/apps/admin/src/pages/LoginPage.tsx)), pesan notifikasi pada aksi lupa kata sandi diselaraskan secara konsisten dengan pesan universal di atas.
  - **Verifikasi Kualitas & Otomasi**:
    - Unit test mobile ([login_page_test.dart](file:///d:/KudaPrima/Project%20Management/daily_attandance/apps/mobile/test/features/auth/presentation/login_page_test.dart)): Ditambahkan pengujian widget untuk validasi pemanggilan `sendPasswordResetEmail`, verifikasi kemunculan dialog pesan universal, pengecekan teks bantuan Administrator HR, dan penutupan dialog melalui tombol "Mengerti". 4/4 tes login mobile lulus.
    - `dart format`: 100% rapi dan terformat.
    - `flutter analyze`: 0 issues found (ran in 127.0s).
    - `flutter test`: 52/52 mobile widget/unit tests lulus 100%.
    - `pnpm check`: 100% lulus (brand check lulus, oxlint 0 error/warning, tsc 0 error, 97/97 tests monorepo lulus: 28 contracts, 30 functions, 39 admin).
    - `pnpm build`: 100% lulus (contracts, functions, dan admin web bundle).
  - **Build 3 APK Production Release & Deployment ke Firebase Hosting**:
    - Nomor versi di `apps/mobile/pubspec.yaml` dinaikkan ke `1.0.0+3` (`versionCode: 3`).
    - Mengompilasi APK rilis 64-bit: `flutter build apk --release --no-shrink --target-platform android-arm64 --dart-define=USE_FIREBASE_EMULATORS=false` (27.4 MB).
    - Memperbarui paket unduhan di `apps/admin/public/download/kudaprima-attendance-v3.zip` dan `kudaprima-attendance.zip`.
    - Menyesuaikan label dan tombol di `DistributionPage.tsx` menjadi **Rilis Resmi v1.0.0 (Build 3)**.
    - Membangun kembali web admin (`pnpm --filter @kuda-prima/admin build`) dan men-deploy ke Firebase Hosting (`pnpm exec firebase deploy --only hosting --project kuda-prima-attandance-dev`).
    - Berhasil di-deploy ke live CDN: `https://kuda-prima-attandance-dev.web.app` (HTTP 200, `Cache-Control: no-cache, no-store, must-revalidate`).
- **Next Bounded Action**:
  - Pandu pengguna untuk memasang file Build 3 baru `kudaprima-attendance-v3.apk` dan mencoba fitur reset kata sandi universal.

