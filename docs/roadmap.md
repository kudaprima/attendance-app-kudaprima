# Delivery Roadmap

## Current scope

Internal attendance for approximately 60 employees. Android 10+ APK distribution;
React admin; Firebase project `kuda-prima-attandance-dev`. iOS and store publication
are outside the active delivery plan (ADR 0003).

## M0/M1: Reliable online attendance and development baseline

Implemented: atomic event/audit/daily-state writes, idempotent retries, event ordering,
12-hour capture age and five-minute future tolerance, bounded JPEG validation,
inactive-account/profile restrictions, real mobile history, WIB daily admin query,
Email/Google/reset UI, fullscreen camera and persistent local emulator sessions.
See project-status.md for the exact verified gates and remaining limitations.

## M2: Encrypted offline queue

Durable encrypted payload/selfie storage with secure-storage keys, account isolation,
12-hour expiry, ordered retry, restart recovery, visible pending/rejected states and
cleanup. Test response loss, app termination, token refresh and network recovery.

## M3: Workforce workflows

Implement backend cross-approval for late/early events and immutable corrections;
then leave/sickness/permission with calendar and reserved balances; then overtime
start/end and minute calculation across midnight. Replace UI fixtures with real
requests/results. Pending leave reserves quota; approval consumes it exactly once.

## M4: Operations

Implemented for the requested admin scope: employee creation, editing, deactivation,
reactivation and confirmed Auth/profile deletion, with Gmail/password provisioning.
The next approved access-model change replaces the Supervisor access role with Admin and adds
manual job titles; see
[the two-role and job-title implementation plan](plans/two-role-job-title-implementation-plan.md).
See ADR 0005 and the employee CRUD runbook. Remaining: real reports/CSV, audit access,
holiday calendar, retention of photos for three months and records for one year, monthly
data-only backup/restore, departed-employee cleanup, observability and rate limits.

## M5: Release and acceptance

Verify online Google/Email login and App Check with authorized development setup.
Build a consistently signed Android APK, real download QR and version metadata.
Perform Android 10 and physical-device tests, accessibility/security checks and a
limited pilot. Add OTA after manual signed APK upgrades are verified. Deployment,
billing and production changes require explicit authorization.
