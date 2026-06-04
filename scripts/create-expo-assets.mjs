import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "apps", "rider-app", "assets");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

await mkdir(assetsDir, { recursive: true });
for (const name of [
  "icon.png",
  "splash-icon.png",
  "adaptive-icon.png",
  "favicon.png",
]) {
  await writeFile(join(assetsDir, name), png);
}

console.log("Expo placeholder assets created.");
