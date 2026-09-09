# ADR 0004: Reliable attendance and persistent local development

- Status: Accepted for this implementation
- Date: 2026-09-08

## Decision

One check-in and one check-out are accepted per employee per WIB calendar day.
Checkout must follow check-in in capture time. Commands older than 12 hours or more
than five minutes in the future are rejected. Already committed commands remain
replayable; the same key cannot be reused with a different payload.

Functions derive an event ID from employee UID and idempotency key. A Firestore
transaction creates the immutable event and audit and updates a private daily state
record. Existing events bootstrap that daily state without rewriting history.
Selfies are decoded as bounded JPEGs before persistence. Each attempt uploads its
own object. Unused uploads are removed after checking whether an uncertain commit
referenced them. Cleanup failures are logged for future retention reconciliation.
This validates image structure, not face identity or liveness.

Clients retain the pending command during an uncertain network failure in the current
session. This is not the encrypted offline queue; durable offline recovery is a later
milestone. Current-day state and history are read from persisted attendance events.

Mobile and admin provide Email/Kata Sandi, Google sign-in and password reset without
fixture account shortcuts. Google uses official SDKs and real tokens only against
online Firebase. Local simulation never sends real Google credentials to Auth
Emulator. Registered employees still require backend-provisioned profiles and claims.

Development emulator data is imported automatically and exported at orderly shutdown.
Two alternating checkpoints run every minute. Only a workspace with no saved dataset
bootstraps synthetic accounts automatically. Existing accounts/passwords, profile data,
office configuration and attendance are preserved. Emulator exports are local synthetic
test fixtures, not production photo backups.

Integration tests use demo-kuda-prima-tests on separate ports and a separate temporary
directory. The separate temp directory is essential: Firebase Storage Emulator clears
its blob directory on shutdown. Sharing OS temp between two Storage emulators can
otherwise remove the development instance's photos.

## Verification and limits

Automated tests cover concurrent retries, distinct-key races, invalid event order,
time bounds, invalid photos, server geofence notes, legacy state, inactive users,
Firestore/Storage authorization, login actions and fullscreen camera error handling.
Real Google OAuth/App Check and camera/GPS on physical Android require separate device
acceptance. App Check configuration for sideloading must follow Firebase's outside-Play
settings; an Auth ID token is not an App Check replacement.

Future work includes encrypted offline storage, approval workflows, holiday calendar,
retention/reconciliation jobs, signed release distribution and OTA. Attendance/audit
remain immutable until their approved retention period expires.
