# Repository Guidelines

## Project Structure & Module Organization

This monorepo contains the Flutter employee app in **apps/mobile**, the React admin portal in **apps/admin**, Firebase Gen 2 functions in **services/functions**, and shared Zod contracts in **packages/contracts**. Firebase rules and indexes live in **firebase**. Keep architecture, domain, security, and setup decisions in **docs**. Put the supplied company logo in **assets/branding/pt-kuda-prima-logo.png**.

## Build, Test, and Development Commands

On Windows, first run **. .\scripts\use-dev-env.ps1** so caches and Android tooling use drive D. Use **pnpm install --frozen-lockfile** to restore JavaScript dependencies, **pnpm dev:admin** for the admin portal, and **pnpm emulators** for local Firebase services. Run **pnpm check** and **pnpm build** before review. For mobile, use **flutter analyze**, **flutter test**, and **flutter run** from **apps/mobile**. Start the Android 10 AVD with **.\scripts\start-android-emulator.ps1**. For USB hardware, run **.\scripts\prepare-android-device.ps1** and follow **docs/testing/android-physical-device.md**.

## Coding Style & Naming Conventions

Use two-space indentation and UTF-8/LF files. Format JavaScript/TypeScript with Prettier and Dart with **dart format**. Name React components and Dart types in PascalCase, functions/variables in camelCase, and files in kebab-case for TypeScript or snake_case for Dart. Reuse shadcn/ui components from **apps/admin/src/components/ui**. Keep mobile code feature-first with presentation, application, domain, and data boundaries.

## Testing Guidelines

Vitest covers admin, contracts, and Functions; Flutter Test covers mobile. Name tests ***.test.ts(x)** or ***\_test.dart**. Test policy logic independently from UI. Backend changes touching Auth, Firestore, Storage, approvals, or retention require Emulator Suite integration tests.

## Commit & Pull Request Guidelines

Read **CONTRIBUTING.md** before Git operations. Use imperative Conventional Commits such as **feat(mobile): add field attendance note** and short-lived branches such as **feat/mobile-attendance-note**. Keep commits focused. Pull requests must explain behavior, tests, security/data impact, linked issue, and screenshots for UI changes. Never commit credentials or generated Firebase app configuration. For branch, commit, push, pull request, or recovery work, apply **.agents/skills/kuda-prima-github-governance**.

For Samsung or other physical Android device setup and diagnosis, apply **.agents/skills/kuda-prima-android-device-testing**.

## Domain and Safety Guardrails

Read **docs/domain-rules.md** and **docs/security-and-retention.md** before feature work. Preserve immutable attendance events, cross-approval, UTC storage/WIB display, and the exact Firebase dev ID **kuda-prima-attandance-dev**. Do not deploy, enable billing, or alter production resources without explicit approval.
