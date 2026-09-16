# ADR 0005: Admin employee lifecycle and Gmail login

- Status: Accepted for the requested implementation
- Date: 2026-09-10

## Scope

Replace the web employee directory fixtures with add, edit and confirmed delete
operations. Role is selected when an employee is created; attendance changes,
approvals, release, and deployment work are outside this decision. Active admins and
supervisors may mutate employees with the same operational permissions.

## Identity and credentials

Require the employee's primary Gmail address and an application password of 8–128
characters. An authorized admin or supervisor acts as the trusted provisioner of that address;
the backend sets `emailVerified: true` on create and email updates. This is an admin
attestation, not an automated proof of mailbox ownership. It prevents the first
verified Google sign-in from replacing an unverified password credential. Both
providers must resolve to the same Firebase UID with one-account-per-email enabled.
An existing Auth account using the address is rejected, never silently adopted.

Creation assigns one of the supported roles (`admin`, `supervisor`, or `technician`)
to both the profile and Auth custom claims. Editing email retains UID, role, Employee ID and employment start date, removes old
federated providers, and revokes refresh tokens. A blank password on edit preserves
the current password. The application password is not the Google account password.
No password or password-derived request digest is written to Firestore or audit.

Real Google OAuth requires the existing authorized Firebase provider/client setup.
Emulator tests use synthetic IdP tokens only on the isolated Auth Emulator and prove
the same-UID/password-preservation behavior there; they do not validate online Google.

## Mutations and failure handling

Shared strict Zod contracts reject unexpected fields. The backend reads the actor's
Auth account and profile, validates matching admin or supervisor claims, email and session revocation time,
and refuses self-deactivation/deletion. Callables enforce App Check online; web
initializes reCAPTCHA Enterprise using `VITE_FIREBASE_APPCHECK_SITE_KEY` when configured.

Firebase Auth and Firestore cannot commit atomically. A private five-minute lease
per UID serializes operations; callables time out after one minute. The profile is
inactive before identity changes and returns to the requested state only with a
completed audit. Failed operations remain inactive and visible for retry. A partially
created row can be completed using Edit or removed using Delete. If creation fails
before a profile exists, cleanup attempts to remove that request's provisional Auth
account; retry with the same request ID can recover a remaining provisional account.
An interrupted deletion must be completed rather than edited into an active account.

Forms send a fresh UUID per operation and retain it for retries. A completed audit
makes a repeated operation a no-op, including a lost response after deletion. Do not
reuse an operation ID for another action or employee. Profile revisions prevent a
stale editor from overwriting a more recent completed change. Passwords stay only in
request memory. Lock and audit collections remain inaccessible to clients under the
existing default-deny rules.

If form values change after a failed save, the next submission receives a new UUID.
An unchanged retry keeps the old UUID. This avoids reporting an old committed
operation as though it had saved newly edited values.

## Deletion and retained records

Confirmed deletion removes Firebase Auth and `users/{uid}` immediately. This is an
explicit exception to the normal departed-employee three-month profile retention
workflow. Existing attendance, selfies and audit retain their separate approved
retention periods; names in immutable events are not rewritten. Signing into Google
after deletion may create an unprovisioned Auth identity, which has no employee
profile or role and cannot access the application.

## Verification

Use isolated Auth 19099, Firestore 18180 and Storage 19299 under
`demo-kuda-prima-tests`. Cover validation, access denial, same-UID Google/password,
provider unlinking after email change, deactivation, immutable history, duplicate
email, stale/concurrent edits, retries and partial failures. UI tests cover form
payloads, blank-password edits, live list state, confirmation and retry feedback.

References: [Firebase user management](https://firebase.google.com/docs/auth/admin/manage-users),
[Google sign-in and account linking](https://firebase.google.com/docs/auth/web/google-signin),
and the installed Auth Emulator implementation in
`firebase-tools/lib/emulator/auth/operations.js` (`handleIdpSigninEmailRequired`).
