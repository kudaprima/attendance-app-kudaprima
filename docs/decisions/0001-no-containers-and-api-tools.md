# ADR 0001: Native Tooling First

Status: accepted

## Decision

Docker tidak diwajibkan pada fase awal. Flutter, Android Emulator, signing iOS, dan kamera/GPS membutuhkan tool native; Firebase production bersifat serverless. Menambahkan Docker Desktop/WSL sekarang akan memakai storage dan RAM tanpa meningkatkan parity untuk alur utama.

Firebase Emulator Suite tetap menjadi environment backend lokal yang reproducible. Jika kelak ada service non-Firebase, worker khusus, atau kebutuhan CI image yang deterministik, keputusan container akan ditinjau ulang dan seluruh image/data Docker diarahkan ke D.

Postman GUI juga tidak diwajibkan sebelum endpoint HTTP stabil. **docs/api/openapi.yaml**, contract tests, dan integration tests adalah sumber kebenaran. Koleksi Postman dapat digenerate dari OpenAPI ketika endpoint admin eksternal mulai tersedia; callable functions tetap diuji lewat Emulator Suite.
