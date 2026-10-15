---
name: kuda-prima-ui-governance
description: Preserve the approved PT Kuda Prima logo, brand tokens, accessibility, and shared mobile/admin visual language when implementing, reviewing, or testing UI changes in this repository.
---

# Kuda Prima UI Governance

Apply this skill to every change involving screens, components, layout, typography, colors,
branding assets, Flutter themes, or shadcn/Tailwind styling.

1. Read `AGENTS.md` and `docs/decisions/0002-brand-system.md` before editing UI.
2. Treat `assets/branding/pt-kuda-prima-logo.png` as the canonical supplied logo. Keep the
   mobile copy byte-identical, preserve its ratio, and do not redraw or recolor it.
3. Preserve the approved hierarchy: neutral `#F7FAFC` 40%, orange `#F25923` 30%, blue
   `#283989` 20%, and purple `#504074` 10%. Percentages guide visual weight rather than exact
   pixels. Status colors remain semantic.
4. Mobile feature widgets consume `Theme.of(context).colorScheme`; keep raw brand colors in
   `apps/mobile/lib/src/core/theme`. The root `AttendanceApp` must continue applying
   `AppTheme.light`, and the login header must retain the canonical logo.
5. Admin UI reuses shadcn/ui components and semantic CSS variables in
   `apps/admin/src/index.css`; do not hardcode brand hex values in feature components.
6. Add or update behavior/visual regression tests at the affected boundary. Run
   `pnpm check:brand`, relevant Flutter or Vitest tests, and a physical-device smoke test for
   material mobile UI changes.
7. When a UI decision or workflow changes, update its ADR/docs, this skill, affected repository
   instructions, and testing runbook in the same change. Do not churn unrelated governance
   files when their behavior remains accurate; state not applicable in the PR instead.
8. Enforce modern TypeScript, React 19, DOM, and accessibility standards:
   - **Component Props Readonly (SonarQube `typescript:S6759`)**: Every React component props
     interface must declare all properties as `readonly`, and the component signature must wrap
     the props parameter in `Readonly<Props>` (e.g. `function Component({ prop }: Readonly<ComponentProps>)`).
   - **No Deprecated React Types**: Do not use deprecated types such as `FormEvent` (deprecated in
     React 19 / `@types/react` v19). Use `SyntheticEvent<HTMLFormElement>` or specific event handlers.
   - **Semantic Live Status & Output (SonarQube `typescript:S6844`)**: Do not use `<div role="status">`
     or `<p role="status">`. Use the native semantic `<output>` element (with `className="block ..."`
     where needed) for live loading states and notices to guarantee cross-device accessibility.
   - **Modern DOM API**: Use `childNode.remove()` instead of `parentNode.removeChild(childNode)`
     (e.g., when cleaning up programmatic file download anchors).
   - **Tailwind CSS v4 IDE Compatibility & Canonical Classes**: Preserve `"css.lint.unknownAtRules": "ignore"`
     in `.vscode/settings.json` so native Tailwind CSS v4 at-rules (`@custom-variant`, `@theme`) are
     linted cleanly. Always prefer canonical Tailwind classes (e.g., `max-w-55` instead of `max-w-[220px]`,
     `lg:w-145` instead of `lg:w-[580px]`) that match the continuous 4px / 0.25rem scale, and enforce
     `"tailwindCSS.lint.suggestCanonicalClasses": "warning"` in workspace settings.
   - **Mobile Login UI Standards**: The mobile login screen must feature:
     1. The canonical company logo in the header card.
     2. An application version badge (`AppConfig.appVersion` / `v1.0.0`) in the top-left corner (`Positioned(top: 14, left: 18)`).
     3. An official 4-color vector Google logo (`_GoogleLogoPainter`) on the "Masuk dengan Google" `OutlinedButton.icon`.
     4. A dynamic corporate copyright notice (`© ${DateTime.now().year} ${AppConfig.companyName}. Seluruh hak cipta dilindungi.`) centered below the card.
   - **Spark-Compliant APK Hosting & Cache Prevention**: Due to Firebase Hosting Spark plan restrictions on direct `.apk` executables, store release payloads as `.zip` packages (e.g. `kudaprima-attendance-v2.zip`) in `apps/admin/public/download/`. Stream them as `application/vnd.android.package-archive` via Blob download. Enforce `Cache-Control: no-cache, no-store, must-revalidate` in `firebase.json` for `/download/**` and append timestamp queries (`?t=${Date.now()}`) to client-side fetches so browser caches never deliver stale APK builds to mobile devices.

Never trade legibility, contrast, touch-target size, error clarity, or platform accessibility
for literal palette percentages.

Current approved attendance UI (ADR 0004): Kehadiran navigation/title, Absen Masuk,
Absen Keluar, Catatan, fullscreen selfie, and standard Email/Kata Sandi/Google/reset
login without synthetic account shortcuts. Never expose photo simulation bypasses.
