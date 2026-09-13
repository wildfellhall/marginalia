import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  cp,
  stat,
  chmod,
  mkdtemp,
  rename,
} from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import JSZip from "jszip";

const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
const zip = new JSZip();
async function addDirectory(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Symlinks are not allowed in a release: ${path}`);
    if (entry.isDirectory()) {
      await addDirectory(path);
      continue;
    }
    const name = relative("dist", path).replaceAll("\\", "/");
    if (
      /(^|\/)(\.|test-results|node_modules|store|scripts|tests)/.test(name) ||
      /\.(map|zip|env|pem|key)$/.test(name)
    )
      throw new Error(`Unexpected release file: ${name}`);
    zip.file(name, await readFile(path), {
      date: new Date("2026-01-01T00:00:00Z"),
      unixPermissions: 0o100644,
    });
  }
}
await addDirectory("dist");
await mkdir("release/site", { recursive: true });
const archive = `marginalia-${manifest.version}-chrome.zip`;
const data = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  platform: "UNIX",
});
await writeFile(`release/${archive}`, data);
await writeFile(
  `release/${archive}.sha256`,
  `${createHash("sha256").update(data).digest("hex")}  ${archive}\n`,
);
// Chrome's Load unpacked / Pack extension dialogs need a real directory.
// Keep that directory separate from the ZIP, source files, and support site.
const unpackedPath = "release/Marginalia-Chrome";
const staging = await mkdtemp("release/.marginalia-unpacked-");
await cp("dist", staging, { recursive: true });
async function setReadableModes(directory) {
  await chmod(directory, 0o755);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await setReadableModes(path);
    else await chmod(path, 0o644);
  }
}
await setReadableModes(staging);
try {
  await stat(unpackedPath);
  await mkdir("release/previous-unpacked", { recursive: true });
  const previous = `release/previous-unpacked/Marginalia-Chrome-${Date.now()}`;
  await rename(unpackedPath, previous);
  console.log(`Preserved the previous unpacked build in ${previous}.`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await rename(staging, unpackedPath);
await writeFile(
  "release/LOAD-OR-PACK.txt",
  `FOR CHROME'S LOAD UNPACKED OR PACK EXTENSION DIALOG\n\nSelect this exact folder:\n${resolve(unpackedPath)}\n\nIts manifest.json is directly inside that folder.\nDo not select the project folder, release folder, source extension folder, or ZIP in these dialogs.\nFor Pack extension, leave the optional private-key field empty on a first pack.\n\nFOR CHROME WEB STORE UPLOAD\n\nUpload ${archive} directly; do not use the Pack extension dialog.\nThe upload ZIP contains manifest.json at its archive root.\n`,
);
for (const name of [
  "about.html",
  "privacy.html",
  "help.html",
  "support.css",
  "icons",
])
  await cp(`dist/${name}`, `release/site/${name}`, { recursive: true });
await cp("dist/about.html", "release/site/index.html");
await cp("store/assets", "release/store-assets", { recursive: true });
try {
  await stat("store/screenshots");
  await cp("store/screenshots", "release/screenshots", { recursive: true });
} catch {
  console.log(
    "Store screenshots have not been captured yet. Run npm run store:screenshots, then npm run release again.",
  );
}
for (const name of [
  "LISTING.md",
  "PRIVACY-DISCLOSURES.md",
  "SUBMISSION.md",
  "publisher.json",
])
  await cp(`store/${name}`, `release/${name}`);
console.log(
  `Created release/${archive} (${(data.length / 1024 / 1024).toFixed(2)} MB), checksum, store assets, and static support site.`,
);
