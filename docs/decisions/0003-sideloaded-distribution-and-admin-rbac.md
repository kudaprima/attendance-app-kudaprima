# ADR 0003: Sideloaded Android APK Distribution and Web Admin RBAC

- Status: Accepted
- Date: 2026-09-07

## Context

PT Kuda Prima is an engineering and field service company with approximately 60 internal employees (field technicians, supervisors, and administrative personnel).

The initial distribution plan assumed app store publication (Google Play Store and Apple App Store). However, for an internal corporate tool of this scale:

1. Public app stores introduce recurring operational friction ($99/year Apple Developer fee, Google Play organizational identity verification with D-U-N-S, and 24–72 hour review delays for critical field bug fixes).
2. Internal field tools do not benefit from public discoverability on consumer stores.
3. The company requires rapid delivery of updates, direct internal QR code distribution, and strict security isolation between mobile technicians and the web management portal.

Furthermore, the Web Admin Portal previously used a development-only auto-login hook without an explicit login screen, role verification, or session management.

## Decision

1. **Sideloaded Android APK Distribution via QR Code**:
   - Target Android 10+ (API 29+) as a standalone, sideloaded APK.
   - Deprecate Google Play Store and Apple App Store submission requirements.
   - Distribute the signed release APK directly through the Web Admin Portal (`/distribusi`) via high-resolution vector QR code cards and direct download links.
   - Sign all APK builds with a consistent corporate release keystore (`upload-keystore.jks`) to prevent `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
   - Use App Check debug provider in development and ID-token / custom attestation verification for production sideloaded builds.

2. **Web Admin Authentication, Security, & Role-Based Access Control (RBAC)**:
   - Implement an official, branded login screen (`LoginPage.tsx`) powered by Firebase Authentication with persistent session support.
   - Enforce server-side Custom Claims (`role: admin | supervisor`) via `AdminAuthGate.tsx`.
   - **Hard Technician Gate**: Technicians (`technician`) are explicitly blocked from accessing the web portal and routed to `AccessDeniedPage.tsx`. Web portal access is strictly restricted to managerial personnel (`admin` and `supervisor`).
   - Inactive accounts (`active: false`) are immediately revoked and blocked.

3. **Strict Cross-Approval Enforcement**:
   - Preserve the invariant that **self-approval is strictly forbidden** across all workflows (Leave, Overtime, Sick Leave, and Field Attendance Corrections).
   - The UI and backend disable and reject approval actions when the applicant UID matches the authenticated approver (`applicantUid === currentUid`).

4. **Employee Profile Data Boundaries**:
   - Employees may update their contact information (`phone`, `homeAddress`) via `edit_contact_dialog.dart`.
   - Core organizational fields (`role`, `employeeId`, `active`, `employmentStartDate`, `employmentStatus`) remain immutable to clients and locked under Firestore Security Rules.

## Consequences

- The distribution cycle is fully sovereign and immediate; updates can be distributed internally within minutes.
- Sideloading requires users to enable "Install unknown apps" permission on Android devices.
- Management workflows on the web portal are cryptographically secured by Firebase Auth ID token claims and Firestore rules.
- Mobile and web maintain distinct, role-appropriate boundaries while sharing domain rules and contracts.
