# Implementation Plan: Attendance Detail with Selfie Photo and OpenStreetMap (Mobile & Web Admin)

- Status: COMPLETED
- Created: 2026-10-06
- Completed: 2026-10-07
- Execution Gate: `COMPLETED_AND_VERIFIED`

## Objective

Enhance the attendance tracking experience across both the **Flutter Mobile App** (Technician Attendance History) and the **React Web Admin Portal** (Admin Attendance Directory & Approvals) by introducing an interactive **Attendance Detail View**.

When a user taps an attendance record, a minimalist detail view displays:
1. **Selfie Face Photo**: Verified selfie capture stored in Firebase Storage, with full-screen lightbox preview and graceful fallback for archived records (> 3 months retention).
2. **Visual Map via OpenStreetMap (OSM)**: 100% free, open-source geographic map rendering without Google Cloud Billing, API keys, or commercial service dependencies. Displays exact employee pin, office geofence circle, and GPS accuracy radius.
3. **External Navigation Shortcut**: "Buka di Google Maps" intent button directing to native map navigation.
4. **Complete Attendance Metadata**: Exact WIB timestamp, location classification (Office vs Field), distance from office, schedule status (On-time, Late, Early departure), approval status, approval reasons, admin review notes, and technician notes.
5. **Aesthetic & UI/UX Principles**: Minimalist, monochromatic/subdued icon language, balanced non-glaring badge tints, and clean backdrop blur/transparency (frosted glass) effects.

---

## Architectural Principles & Strict Invariants

1. **Zero Billing & Free-Tier Strictness**:
   - Must use **OpenStreetMap (OSM)** standard tile servers (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) or CartoDB Positron.
   - Strictly no Google Maps SDK or Mapbox SDK requiring billing accounts, credit cards, or paid API keys.
2. **Cross-Platform Parity**:
   - Both Mobile and Web Admin provide identical detail inspection capabilities.
   - Mobile: Modal Bottom Sheet with smooth swipe-to-dismiss gesture and subtle frosted blur header.
   - Web Admin: Minimalist responsive dialog with split view (Selfie & metadata on the left, interactive OpenStreetMap on the right).
3. **Security, Privacy & Data Retention**:
   - Storage Rules: Technicians may only read their own selfie photos (`request.auth.uid == userId`); Admins may read all employee photos (`request.auth.token.role == 'admin'`).
   - Retention Policy: In accordance with `docs/security-and-retention.md`, selfie photos retain for 3 months. When an archived photo is no longer in Storage, the UI displays a clean informative placeholder rather than a broken image icon.
4. **Performance & Bandwidth Optimization**:
   - List views remain ultra-lightweight. Photos and map tiles are fetched **on-demand** only when the user opens the detail modal.
   - Implement caching for downloaded images and map tiles.

---

## Component Specifications

### 1. Mobile Application (`apps/mobile`)

- **Trigger**: Tapping any card in `AttendanceHistoryTabView` (`onTap` gesture with subtle ink feedback).
- **Presentation**: `AttendanceDetailBottomSheet` (DraggableScrollableSheet, 85% initial screen height).
- **Map Implementation**:
  - Library: `flutter_map: ^7.0.2` + `latlong2: ^0.9.1` (BSD-3 licensed).
  - Layers:
    - `TileLayer` using OpenStreetMap standard tile provider with custom User-Agent.
    - `CircleMarker` representing office geofence radius (50m) and GPS accuracy ring.
    - `MarkerLayer` with custom pin icon indicating exact employee coordinates.
  - External Launch: `url_launcher` targeting `https://www.google.com/maps/search/?api=1&query={lat},{lng}`.
- **Photo Display**:
  - `Image.network` with loading shimmer and error fallback.
  - Tap photo opens `PhotoLightboxDialog` with pinch-to-zoom capability (`InteractiveViewer`).
- **Styling**:
  - Backdrop blur: `BackdropFilter` with `ImageFilter.blur(sigmaX: 10, sigmaY: 10)` on floating detail pill and header.
  - Monochromatic outline icons matching `AppColors.foreground` and `AppColors.muted`.
  - Badges using PT Kuda Prima semantic color tokens (`#E8F5E9`, `#FFF3E0`, `#FFE4D8`).

### 2. Web Admin Portal (`apps/admin`)

- **Trigger**: Clicking on any attendance entry row in `ApprovalsPage.tsx` or Employee Attendance history.
- **Presentation**: `AttendanceDetailDialog` (shadcn/ui Dialog with responsive 2-column layout).
- **Map Implementation**:
  - Library: `leaflet: ^1.9.4` + `react-leaflet: ^4.2.1` (MIT licensed).
  - OpenStreetMap tiles with attribution.
  - Markers: Office center marker + Employee captured position marker + Geofence radius circle.
  - "Buka di Google Maps" external link button.
- **Photo Display**:
  - Face inspection container with rounded corners and subtle border.
  - Lightbox zoom modal on click.
  - Storage download URL resolved via Firebase client SDK.
- **Styling**:
  - Tailwind CSS + shadcn semantic tokens (`bg-background/80 backdrop-blur-md`).
  - Subdued badges with neutral outline and soft status indicators.

---

## Phased Implementation Plan

### Phase 1: Mobile Detail Bottom Sheet & OpenStreetMap
1. [x] Add `flutter_map: ^7.0.2` and `latlong2: ^0.9.1` to `apps/mobile/pubspec.yaml`.
2. [x] Create `AttendanceDetailBottomSheet` in `apps/mobile/lib/src/features/attendance/presentation/widgets/attendance_detail_bottom_sheet.dart`.
3. [x] Implement OpenStreetMap widget with pin marker, office radius circle, and Google Maps launcher button.
4. [x] Implement photo loading with loading indicator, retention expiration fallback, and tap-to-zoom.
5. [x] Wire `onTap` in `AttendanceHistoryTabView` to present the bottom sheet.
6. [x] Write unit & widget tests in `apps/mobile/test/` asserting bottom sheet rendering, map widget presence, and fallback behavior.

### Phase 2: Web Admin Detail Dialog & Leaflet Map
1. [x] Add `leaflet` and `react-leaflet` to `apps/admin/package.json`.
2. [x] Create `AttendanceDetailDialog.tsx` in `apps/admin/src/components/attendance/AttendanceDetailDialog.tsx`.
3. [x] Implement Leaflet OpenStreetMap view with employee pin and office radius circle.
4. [x] Implement selfie face preview and admin approval actions (Approve/Reject with notes directly from modal).
5. [x] Wire row click action in `ApprovalsPage.tsx` and `App.tsx`.
6. [x] Write Vitest tests in `apps/admin/` verifying modal render, map container, and status badges.

### Phase 3: Monorepo Quality Gate & Manual Simulator Verification
1. [x] Run `dart format lib test` and `flutter analyze` on `apps/mobile` (PASSED - 0 issues).
2. [x] Run `pnpm check:brand` and `pnpm check` on monorepo (PASSED - brand check, contracts build, oxlint 0/0, typecheck, vitest 80/80 passed).
3. [x] Run `flutter test` across all mobile test suites (PASSED - 45/45 passed).
4. [x] **User Manual E2E Simulation**: Verified end-to-end in Android Emulator & Web Admin by user with persistent Firebase Emulator Suite. All workflows verified, selfie photos load cleanly, OpenStreetMap renders without Google billing, and header role designation displays accurately.

---

## Acceptance Criteria

- [x] Automated Tests: 100% passing tests across all Flutter (45) and Vitest (80) suites (Total: 125/125).
- [x] Brand Check: `pnpm check:brand` passes with 0 failures (tokens, logos, and theme consistent).
- [x] Static Analysis & Lint: `oxlint` 0 warnings/errors, `flutter analyze` 0 issues, `tsc` 0 errors.
- [x] Mobile Manual Acceptance: Tapping an attendance item in Menu Riwayat opens a modal bottom sheet displaying the selfie photo, visual OpenStreetMap, and complete details.
- [x] Mobile Manual Acceptance: Map displays employee pin and office radius without requiring Google Cloud API keys or billing.
- [x] Mobile Manual Acceptance: Tapping "Buka di Google Maps" launches the coordinates in native Google Maps.
- [x] Web Admin Manual Acceptance: Clicking an attendance item opens a dialog displaying the selfie photo and OpenStreetMap.
- [x] Design Acceptance: UI is minimalist, using monochromatic icons, soft non-glaring badge colors, and clean backdrop blur effects.

---

## Completion Summary (2026-10-07)

- **Verification**: Complete manual simulation across Android Emulator (AVD) and Web Admin against persistent Firebase Emulator Suite performed by user. All functionality verified working.
- **Parity Fixes Delivered**:
  1. Connected `FirebaseStorage.instance.useStorageEmulator` in `apps/mobile/lib/src/core/firebase/firebase_bootstrap.dart` for emulator development while keeping production cloud storage direct and flexible.
  2. Unified canonical storage bucket fallback to `${projectId}.firebasestorage.app` in `apps/admin/src/lib/firebase.ts` matching `google-services.json` and Firebase Gen 2 defaults, with resilient dual-bucket fallback in `AttendancePhotoView.tsx`.
  3. Added smart fallback for header admin navbar in `apps/admin/src/App.tsx`, displaying "Masuk sebagai Administrator Sistem" instead of literal "Belum diisi".
- **Final Status**: Feature completed, fully verified, and ready for integration.
