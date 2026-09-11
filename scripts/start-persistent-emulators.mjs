import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const project = "kuda-prima-attandance-dev";
const temporaryRoot = resolve(".emulator-data/runtime");
mkdirSync(temporaryRoot, { recursive: true });
const runtimeEnv = {
  ...process.env,
  DEBUG: "",
  TEMP: temporaryRoot,
  TMP: temporaryRoot,
  TMPDIR: temporaryRoot,
};
const cli = resolve("node_modules/firebase-tools/lib/bin/firebase.js");
const authOnly = process.argv.includes("--auth-only");
const dataRoot = resolve(
  authOnly ? ".emulator-data/auth" : ".emulator-data/development",
);
const checkpoints = [dataRoot + "-checkpoint-0", dataRoot + "-checkpoint-1"];
const snapshots = [dataRoot, ...checkpoints]
  .filter((path) => existsSync(resolve(path, "firebase-export-metadata.json")))
  .sort(
    (a, b) =>
      statSync(resolve(b, "firebase-export-metadata.json")).mtimeMs -
      statSync(resolve(a, "firebase-export-metadata.json")).mtimeMs,
  );
mkdirSync(dataRoot, { recursive: true });
const run = (command, args, stdio = "inherit") =>
  new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      stdio,
      windowsHide: true,
      env: runtimeEnv,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolveResult()
        : reject(new Error(`Command failed (${code})`)),
    );
  });
let active = true;
let saving = false;
let checkpointIndex = snapshots[0] === checkpoints[0] ? 1 : 0;
async function checkpoint() {
  if (!active || saving) return;
  saving = true;
  try {
    await run(
      process.execPath,
      [
        cli,
        "emulators:export",
        checkpoints[checkpointIndex],
        "--project",
        project,
        "--force",
      ],
      "ignore",
    );
    checkpointIndex = (checkpointIndex + 1) % 2;
    console.info("[data] Checkpoint emulator tersimpan.");
  } catch {
    console.warn(
      "[data] Checkpoint belum berhasil; snapshot sebelumnya dipertahankan.",
    );
  } finally {
    saving = false;
  }
}
const args = [
  cli,
  "emulators:start",
  "--project",
  project,
  "--only",
  authOnly
    ? "auth"
    : process.argv.includes("--all")
      ? "auth,firestore,functions,storage,hosting"
      : "auth,firestore,functions,storage",
  "--export-on-exit",
  dataRoot,
];
if (snapshots[0]) {
  args.push("--import", snapshots[0]);
  console.info(`[data] Memulihkan ${snapshots[0]}`);
}
console.info(
  "[data] Akun dan riwayat disimpan lokal. Hentikan dengan Ctrl+C untuk export akhir.",
);
const emulator = spawn(process.execPath, args, {
  stdio: "inherit",
  windowsHide: true,
  env: runtimeEnv,
});
const timer = setInterval(checkpoint, 60000);
// Both processes share the console: Firebase handles Ctrl+C and exports before exiting.
process.on("SIGINT", () => {
  clearInterval(timer);
});
emulator.on("error", (error) => {
  console.error(error.message);
  active = false;
  clearInterval(timer);
  process.exitCode = 1;
});
emulator.on("exit", (code) => {
  active = false;
  clearInterval(timer);
  process.exitCode = code ?? 1;
});
async function ready() {
  for (let attempt = 0; attempt < 120 && active; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:4400/emulators", {
        signal: AbortSignal.timeout(1000),
      });
      const services = await response.json();
      if (
        services.auth &&
        (authOnly ||
          (services.firestore && services.storage && services.functions))
      ) {
        if (!snapshots.length) {
          // Empty workspace only. Existing exports are restored without re-seeding.
          await run(process.execPath, [
            resolve(
              authOnly
                ? "services/functions/lib/development/seed-auth-emulator.js"
                : "services/functions/lib/development/seed-profile-emulator.js",
            ),
          ]);
        }
        await checkpoint();
        return;
      }
    } catch {
      /* Firebase still starting. */
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  if (active)
    console.warn(
      "[data] Emulator belum siap. Periksa log sebelum melakukan simulasi.",
    );
}
await ready();
