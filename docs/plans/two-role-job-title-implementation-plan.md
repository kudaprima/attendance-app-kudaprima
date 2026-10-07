# Implementation Plan: Two-role access and manual job titles

- Status: Approved for the next implementation stage
- Approved: 2026-09-11
- Implementation status: COMPLETED

## Objective

Replace the current `admin | supervisor | technician` access model with two technical
roles, `admin | technician`, and add a manually maintained `jobTitle` field. A Manager,
Supervisor, or other managerial position receives the `admin` role while the organizational
position remains visible through `jobTitle`.

This separates authorization from organizational naming:

- `role` controls application access and privileged operations.
- `jobTitle` describes the employee's position and never grants access.
- Cross approval compares actor UID and requester UID. A job title must not participate in
  authorization decisions.

## Scope

1. Update shared contracts, web and mobile role models, Functions authorization, Firebase
   Rules, development fixtures, tests, and documentation to support only `admin` and
   `technician`.
2. Add `jobTitle` to employee profiles and employee management commands.
3. Allow an Admin to select access role and enter a job title when creating an employee.
4. Allow an Admin to update another employee's access role and job title with safeguards.
5. Migrate existing Supervisor access to Admin access without losing organizational titles,
   authentication providers, employee IDs, attendance history, or audit history.
6. Preserve the prerequisites for strict cross approval: at least two active Admin accounts
   and no self approval.

Implementing the pending approval workflow, changing attendance policy, adding reports,
deploying Firebase resources, and releasing an APK are outside this plan.

## Target data model

The canonical profile fields become:

```ts
type UserRole = "admin" | "technician";

interface EmployeeAccessProfile {
  role: UserRole;
  jobTitle: string;
}
```

`jobTitle` requirements:

- Entered manually by an authorized Admin.
- Trimmed, 2-100 characters, and stored as a display string.
- May contain Unicode letters, numbers, spaces, periods, commas, ampersands, slashes,
  parentheses, and hyphens.
- Does not need to be unique.
- Is never copied into Firebase Auth custom claims.

New employee writes require `jobTitle`. During migration, readers temporarily accept a missing
or null value and display `Belum diisi`. After every active profile has been backfilled, the
compatibility path is removed and the field becomes required on reads as well as writes.

## Authorization invariants

- Only an active account whose ID token claim, Auth custom claim, and Firestore profile all
  contain `role: "admin"` can enter the web portal or perform employee management and approval
  operations.
- A Technician remains blocked from the web portal.
- An Admin may continue using the mobile application for attendance.
- An Admin cannot demote, deactivate, or delete the account used for the current session.
- A role change, deactivation, or deletion must not leave fewer than two active Admin accounts.
- Operations that change the active Admin count use one global access-management lease or
  serialized counter in addition to the existing per-employee mutation lease. This prevents
  concurrent requests from both passing the minimum-Admin check.
- Role changes update Auth custom claims and Firestore profile state through the existing
  pause, retry, revision, and audit mechanism. Access remains disabled while the two systems
  disagree.
- A reused request ID cannot change the selected role or job title from the original operation.
- Cross approval requires an active Admin and rejects `actorUid === requesterUid` at the
  backend, regardless of job title.

## Migration strategy

Use a versioned, idempotent Admin SDK migration with dry-run mode. Do not expose the migration
as a public callable.

### Phase 1: Compatibility

1. Add optional-read support for `jobTitle`.
2. Continue recognizing legacy `supervisor` profiles only in the migration compatibility path.
3. Prevent new employee writes from creating `supervisor` roles.
4. Add a private migration record per UID so reruns can distinguish pending and completed work.
5. Initialize and verify the active-Admin counter or global authorization state.

### Phase 2: Data conversion

For every existing profile:

| Existing role | New role     | Initial job title                                                           |
| ------------- | ------------ | --------------------------------------------------------------------------- |
| `supervisor`  | `admin`      | `Supervisor` when no manual title exists                                    |
| `admin`       | `admin`      | Preserve an existing title; otherwise `Belum diisi` until manual completion |
| `technician`  | `technician` | Preserve an existing title; otherwise `Belum diisi` until manual completion |

For each legacy Supervisor account:

1. Acquire the migration lease and record the original profile and claims without credentials.
2. Mark profile access inactive while Auth and Firestore are being synchronized.
3. Set the Auth custom claim to `admin`.
4. Set Firestore role to `admin`, retain the Employee ID and all employment fields, and populate
   `jobTitle` when missing.
5. Restore the requested active state, revoke refresh tokens, write an immutable audit entry,
   and mark the migration record complete.
6. A retry resumes from the recorded phase without allocating another UID or Employee ID.

### Phase 3: Removal

1. Verify that no Auth claim, profile, fixture, rule, test, or client enum still contains
   `supervisor` as an access role.
2. Change the canonical role schema to `admin | technician`.
3. Remove the legacy compatibility parser.
4. Change Firestore and Storage Rules to authorize privileged access only when the claim and
   profile both equal `admin`.
5. Force affected sessions to refresh and verify that migrated users can sign in again.

Production execution, deployment, and token revocation require a separate explicit approval.

## Backend and contracts

1. Change `userRoleSchema` to accept `admin` and `technician` only.
2. Add a reusable `jobTitleSchema` and include it in profile provisioning, employee creation,
   employee updates, attendance profile parsing, and returned profile models.
3. Permit `role` and `jobTitle` in the update command so an existing employee can be promoted,
   demoted, or moved to another position without recreating the account.
4. Replace Supervisor/Admin manager checks with an Admin-only authorization helper.
5. Synchronize the selected role to Auth custom claims on create and role update.
6. Preserve UID, Employee ID, employment start date, providers, attendance events, and audit
   history during role or job-title changes.
7. Audit the actor, subject, changed field names, previous and new role, whether job title
   changed, revision, and server timestamp. Never audit passwords.
8. Maintain the minimum-active-Admin invariant through a serialized global state transition.

## Web admin portal

### Employee form

- Rename the visible `Role` field to `Hak Akses`.
- Provide exactly two options: `Admin` and `Teknisi`.
- Add a required `Jabatan` text input to Add Employee.
- Add editable `Hak Akses` and `Jabatan` fields to Edit Employee.
- Keep password visibility, Gmail validation, downward-opening dropdowns, and current retry
  behavior.
- Explain that Admin grants portal and approval access, while Jabatan is descriptive.
- Show a specific validation message when job title is missing or invalid.
- Show a confirmation warning before a role promotion or demotion is saved.

### Directory and session UI

- Display separate `Hak Akses` and `Jabatan` columns.
- Display `Belum diisi` for transitional profiles without a job title.
- Show the current user's job title in the header, for example `Masuk sebagai Manager
Operasional`, without showing email.
- Keep access-sensitive controls based on `role`, never on displayed job title.
- Add role, job-title, and account-status filters when directory size makes filtering useful.

## Mobile application

1. Change the Dart role model to Admin and Technician only after migration compatibility is in
   place.
2. Add `jobTitle` to the employee profile domain model and Firebase repository.
3. Temporarily map a legacy Supervisor profile to Admin during the migration window, then
   remove that fallback after Phase 3.
4. Show Jabatan on the Profile screen and any account summary where role is currently shown.
5. Keep attendance eligibility and workflow independent of job title.
6. Keep Admin accounts eligible for mobile attendance.
7. Display a clear profile-completion message for a missing job title without blocking login
   during the migration window.

## Firebase Rules and development fixtures

- Replace `admin | supervisor` privileged checks in Firestore and Storage Rules with `admin`.
- Continue requiring the Auth claim and profile role to match.
- Keep corporate profile fields writable only through authorized Functions.
- Update synthetic development accounts so the former Supervisor fixture uses:

```json
{
  "role": "admin",
  "jobTitle": "Supervisor"
}
```

- Give the existing Admin fixture a distinct title such as `Administrator Sistem` and each
  Technician fixture an explicit synthetic title.
- Preserve the exact development Firebase project ID and persistent manual-test dataset.

## Test plan

### Contracts and unit tests

- Accept `admin` and `technician`; reject `supervisor` and unknown roles.
- Validate, trim, and bound `jobTitle`.
- Require role and job title on create.
- Accept guarded role and job-title changes on edit.
- Verify mobile parsing during and after the compatibility window.

### Emulator Suite integration tests

- Create Admin and Technician accounts and verify matching Auth claims and Firestore profiles.
- Promote Technician to Admin and demote another Admin while preserving UID and Employee ID.
- Reject self-demotion, self-deactivation, and self-deletion.
- Reject an operation that would leave fewer than two active Admin accounts.
- Serialize two concurrent demotion or deletion attempts so only one can succeed.
- Convert a legacy Supervisor to Admin idempotently and preserve providers and historical data.
- Recover safely from failures between claim, Auth, profile, counter, and audit updates.
- Reject a legacy Supervisor token after the removal phase.
- Verify an Admin can approve another Admin's request and cannot approve their own request once
  the approval backend is implemented.

### Web component tests

- Show only Admin and Technician access options.
- Require and submit Jabatan.
- Confirm role changes and display backend failures without closing the form.
- Render separate access and job-title columns.
- Keep Technician out of the portal and allow Admin access.
- Display session job title without exposing email.

### Mobile tests

- Parse and display job title.
- Preserve Admin and Technician attendance access.
- Handle a missing transitional job title.
- Reject removed or mismatched role values after migration completes.

### Manual acceptance simulation

1. Start the persistent Emulator Suite and portal using the repository runbook.
2. Verify two different active Admin accounts with different job titles can access the portal.
3. Create a Technician and an Admin, then verify role claims, job titles, login, and attendance.
4. Promote the Technician to Admin and verify a refreshed session gains portal access.
5. Attempt self-demotion and reducing active Admin count below two; both must fail.
6. Submit an approval request as one Admin and confirm only the other Admin can approve it when
   the approval backend milestone is available.
7. Restart the persistent suite and verify migrated roles and job titles remain stored.

## Recommended implementation order

1. Update ADRs, domain/security rules, this plan, and migration runbook.
2. Add the transitional job-title model and compatibility reads.
3. Implement the idempotent migration and active-Admin global guard.
4. Update shared contracts and Functions employee management.
5. Update Firebase Rules and development fixtures.
6. Update the web portal form, directory, session label, and access gate.
7. Update the mobile profile model and display.
8. Run contract, web, Functions, Rules, Emulator Suite, Flutter, brand, and build checks.
9. Perform the manual migration and cross-account acceptance simulation.
10. Remove Supervisor compatibility only after the zero-legacy-role check passes.

## Acceptance criteria

- The canonical role type contains only Admin and Technician.
- No new or edited account can persist a Supervisor access role.
- Every newly created profile has a manually entered job title.
- Existing Supervisor accounts become Admin accounts with their position retained as a job
  title.
- Auth claims, Firestore profiles, portal access, and mobile parsing agree on the new role.
- Job title is visible but never changes authorization behavior.
- At least two active Admin accounts remain available for cross approval.
- Self approval and self-removal protections remain enforced by UID.
- Existing authentication providers, UIDs, Employee IDs, attendance events, and audits remain
  intact.
- All relevant automated gates and the manual acceptance scenarios pass before any production
  rollout.

## Rollback and recovery

- Keep the migration mapping and per-UID phase records until acceptance is complete.
- A failed migration leaves the affected account inactive and resumable.
- Code rollback must retain the compatibility reader until all partially migrated accounts are
  reconciled.
- Restore claims and profile role only from the migration record; never infer them from job
  title.
- Do not delete migration audit records, historical attendance, or authentication providers
  during recovery.
