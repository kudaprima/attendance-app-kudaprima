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

Never trade legibility, contrast, touch-target size, error clarity, or platform accessibility
for literal palette percentages.
