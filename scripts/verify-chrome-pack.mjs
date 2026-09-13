import {
  access,
  cp,
  mkdtemp,
  readFile,
  chmod,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import JSZip from "jszip";

const source = resolve("release/Marginalia-Chrome");
await access(join(source, "manifest.json"), constants.R_OK);
const manifest = JSON.parse(
  await readFile(join(source, "manifest.json"), "utf8"),
);
const work = await mkdtemp(join(tmpdir(), "marginalia-chrome-pack-"));
const packRoot = join(work, "Marginalia-Chrome");
await cp(source, packRoot, { recursive: true });
let executable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
try {
  await access(executable, constants.X_OK);
} catch {
  executable = chromium.executablePath();
}
const result = await new Promise((resolve, reject) => {
  const child = spawn(
    executable,
    [
      `--user-data-dir=${join(work, "browser-profile")}`,
      `--pack-extension=${packRoot}`,
      "--no-message-box",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const timer = setTimeout(() => {
    child.kill();
    reject(new Error("Chrome pack command timed out."));
  }, 45000);
  child.on("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on("exit", (code) => {
    clearTimeout(timer);
    resolve({ code, output });
  });
});
const crxPath = packRoot + ".crx",
  keyPath = packRoot + ".pem";
let crx;
try {
  crx = await readFile(crxPath);
} catch {
  throw new Error(
    `Chrome did not produce a CRX (exit ${result.code}): ${result.output}`,
  );
}
await chmod(keyPath, 0o600);
if (crx.toString("ascii", 0, 4) !== "Cr24" || crx.readUInt32LE(4) !== 3)
  throw new Error("Chrome did not produce a CRX3 package.");
const headerSize = crx.readUInt32LE(8);
const contents = await JSZip.loadAsync(crx.subarray(12 + headerSize), {
  checkCRC32: true,
});
const packedManifest = JSON.parse(
  await contents.file("manifest.json").async("string"),
);
if (JSON.stringify(packedManifest) !== JSON.stringify(manifest))
  throw new Error("Chrome's packed manifest differs from the source.");
const uploadPath = `release/marginalia-${manifest.version}-chrome.zip`;
const report = {
  extensionRoot: source,
  manifestReadable: true,
  manifestVersion: manifest.manifest_version,
  extensionVersion: manifest.version,
  chromeExecutable: executable,
  chromePackExitCode: result.code,
  chromePackSucceeded: true,
  crxFormat: 3,
  crxBytes: (await stat(crxPath)).size,
  uploadZipSha256: createHash("sha256")
    .update(await readFile(uploadPath))
    .digest("hex"),
  privateKeyIncludedInRelease: false,
};
await writeFile(
  "release/CHROME-PACK-VERIFIED.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
console.log(
  "The pack check used a temporary copy and a temporary browser profile. Its private signing key stays outside the release package.",
);
