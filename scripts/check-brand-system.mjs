import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const requiredText = new Map([
  [
    "apps/mobile/lib/src/app.dart",
    [
      "theme: AppTheme.light",
      "import 'package:attendance/src/core/theme/app_theme.dart'",
    ],
  ],
  [
    "apps/mobile/lib/src/features/auth/presentation/login_page.dart",
    [
      "assets/branding/pt-kuda-prima-logo.png",
      "Key('login-brand-logo')",
      "Logo PT Kuda Prima",
    ],
  ],
  [
    "apps/mobile/lib/src/core/theme/app_colors.dart",
    ["0xFFF7FAFC", "0xFFF25923", "0xFF283989", "0xFF504074"],
  ],
  [
    "apps/admin/src/index.css",
    [
      "--background: #f7fafc",
      "--secondary: #f25923",
      "--primary: #283989",
      "--accent: #504074",
    ],
  ],
]);

const failures = [];

for (const [path, expectedValues] of requiredText) {
  const content = await readFile(path, "utf8");
  for (const expected of expectedValues) {
    if (!content.includes(expected)) {
      failures.push(`${path} tidak memuat invariant: ${expected}`);
    }
  }
}

const canonicalLogo = await readFile("assets/branding/pt-kuda-prima-logo.png");
const mobileLogo = await readFile(
  "apps/mobile/assets/branding/pt-kuda-prima-logo.png",
);
const digest = (content) => createHash("sha256").update(content).digest("hex");

if (digest(canonicalLogo) !== digest(mobileLogo)) {
  failures.push(
    "Asset logo mobile tidak identik dengan source branding kanonis.",
  );
}

if (failures.length > 0) {
  console.error("Brand system check gagal:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.info(
    "Brand system check lulus: logo, Flutter theme, dan token admin konsisten.",
  );
}
