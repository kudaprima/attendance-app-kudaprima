# ADR 0002: Shared Brand Color System

- Status: Accepted
- Date: 2026-09-03

## Context

Mobile and admin need a consistent PT Kuda Prima identity without reducing readability or
coupling feature code to raw color values. The approved visual balance is 40% neutral
`#F7FAFC`, 30% orange `#F25923`, 20% blue `#283989`, and 10% purple `#504074`.

## Decision

- Treat the percentages as visual hierarchy guidance, not a pixel-level calculation.
- Use `#F7FAFC` for the dominant background and surface family.
- Use blue as the primary action color with white foreground.
- Use orange for secondary emphasis with a dark foreground; white on orange does not meet the
  normal-text contrast target.
- Use purple as the tertiary accent with white foreground.
- Define semantic tokens centrally in Flutter and the shadcn/ui CSS theme. Feature widgets
  must consume theme roles instead of duplicating brand hex values.
- Keep success, warning, error, and information colors semantic; do not replace them with a
  brand color when that would obscure status meaning.
- Preserve the official logo source without recoloring, redrawing, or changing its ratio.
- Keep `pnpm check:brand` in the repository quality gate so feature branches cannot remove the
  root Flutter theme, canonical login logo, matching mobile asset, or approved admin tokens.

## Consequences

The two clients can evolve independently while preserving the same visual language. Derived
container and dark-mode colors are allowed when required for hierarchy and accessibility. UI
changes must include contrast and regression checks, and a higher-resolution official logo
should replace the current development asset before store release.
