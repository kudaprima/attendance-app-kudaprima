import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const temporaryRoot = resolve(".tmp/emulator-tests");
mkdirSync(temporaryRoot, { recursive: true });
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/firebase-tools/lib/bin/firebase.js"),
    "emulators:exec",
    "--config",
    "firebase.test.json",
    "--only",
    "firestore,storage",
    "--project",
    "demo-kuda-prima-tests",
    "pnpm --filter @kuda-prima/functions test:emulator",
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      DEBUG: "",
      TEMP: temporaryRoot,
      TMP: temporaryRoot,
      TMPDIR: temporaryRoot,
    },
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
