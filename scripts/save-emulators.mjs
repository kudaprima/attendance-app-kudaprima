import { spawn } from "node:child_process";
import { resolve } from "node:path";
const temporaryRoot = resolve(".emulator-data/runtime");
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/firebase-tools/lib/bin/firebase.js"),
    "emulators:export",
    ".emulator-data/development",
    "--project",
    "kuda-prima-attandance-dev",
    "--force",
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
