# Admin Portal

Dashboard supervisor/admin PT Kuda Prima dibangun dengan React, TypeScript, Vite, Tailwind CSS, dan shadcn/ui.

```powershell
pnpm --filter @kuda-prima/admin dev
pnpm --filter @kuda-prima/admin test
pnpm --filter @kuda-prima/admin build
```

Konfigurasi Firebase dibaca dari file environment lokal berdasarkan **.env.example** di root. Jangan commit file environment. Reuse komponen registry di **src/components/ui** dan tempatkan komponen domain di folder feature, bukan mengubah primitive shadcn tanpa kebutuhan.
