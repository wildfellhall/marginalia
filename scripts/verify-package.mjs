import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join, dirname, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import JSZip from "jszip";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const archive = `release/marginalia-${pkg.version}-chrome.zip`;
const zip = await JSZip.loadAsync(await readFile(archive), {
  checkCRC32: true,
});
const destination = await mkdtemp(join(tmpdir(), "marginalia-release-check-"));
for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  const path = resolve(destination, name);
  if (!path.startsWith(destination + sep))
    throw new Error("Invalid path in archive");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await entry.async("nodebuffer"));
}
const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/verify-extension.mjs"], {
    stdio: "inherit",
    env: { ...process.env, MARGINALIA_EXTENSION_PATH: destination },
  });
  child.on("error", reject);
  child.on("exit", resolve);
});
if (code !== 0) process.exitCode = code || 1;
else
  console.log(
    `PASS: the extension extracted from ${archive} works in Chromium.`,
  );
