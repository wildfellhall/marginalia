import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import JSZip from "jszip";
import sharp from "sharp";
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const archive = `marginalia-${pkg.version}-chrome.zip`;
const data = await readFile(`release/${archive}`);
const zip = await JSZip.loadAsync(data, { checkCRC32: true });
const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, pkg.version);
assert(manifest.description.length <= 132);
assert.equal(manifest.minimum_chrome_version, "140");
assert.deepEqual(
  [...manifest.permissions].sort(),
  ["activeTab", "storage", "unlimitedStorage"].sort(),
);
assert(
  !manifest.key && !manifest.update_url && !manifest.externally_connectable,
);
assert.deepEqual(manifest.content_scripts[0].matches, [
  "http://*/*",
  "https://*/*",
]);
const files = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
for (const name of files) {
  const extracted = await readFile(`release/Marginalia-Chrome/${name}`);
  assert(
    extracted.equals(await zip.file(name).async("nodebuffer")),
    `Unpacked file differs from ZIP: ${name}`,
  );
}
assert(
  files.every(
    (name) => !name.startsWith("dist/") && !/\.(map|env|pem|key)$/.test(name),
  ),
);
for (const name of [
  "index.html",
  "content.js",
  "background.js",
  "popup.html",
  "popup.js",
  "popup.css",
  "privacy.html",
  "help.html",
  "about.html",
  "THIRD_PARTY_NOTICES.txt",
])
  assert(zip.file(name), `Missing ${name}`);
for (const [size, path] of Object.entries(manifest.icons)) {
  const metadata = await sharp(
    await zip.file(path).async("nodebuffer"),
  ).metadata();
  assert.equal(metadata.width, Number(size));
  assert.equal(metadata.height, Number(size));
  assert.equal(metadata.format, "png");
}
for (const name of files.filter((n) => n.endsWith(".html"))) {
  const html = await zip.file(name).async("string");
  assert(
    !/<script[^>]+src=["']https?:/i.test(html),
    `Remote script in ${name}`,
  );
  assert(
    !/on(?:click|load|error)\s*=/i.test(html),
    `Inline event handler in ${name}`,
  );
  assert(
    !/\[YOUR|TODO|PLACEHOLDER/.test(html),
    `Unfilled placeholder in ${name}`,
  );
}
for (const prefix of [
  "pdfjs/cmaps/",
  "pdfjs/standard_fonts/",
  "pdfjs/wasm/",
  "pdfjs/iccs/",
])
  assert(
    files.some((n) => n.startsWith(prefix)),
    `Missing bundled PDF resources ${prefix}`,
  );
for (const [path, width, height] of [
  ["store/assets/store-icon-128.png", 128, 128],
  ["store/assets/promo-440x280.png", 440, 280],
  ["store/assets/marquee-1400x560.png", 1400, 560],
]) {
  const metadata = await sharp(path).metadata();
  assert.equal(metadata.width, width);
  assert.equal(metadata.height, height);
}
const screenshots = (await readdir("store/screenshots")).filter((n) =>
  n.endsWith(".png"),
);
assert(screenshots.length >= 1 && screenshots.length <= 5);
for (const name of screenshots) {
  const metadata = await sharp(`store/screenshots/${name}`).metadata();
  assert.equal(metadata.width, 1280);
  assert.equal(metadata.height, 800);
}
const checksum = createHash("sha256").update(data).digest("hex");
assert(
  (await readFile(`release/${archive}.sha256`, "utf8")).startsWith(checksum),
);
const publisher = JSON.parse(await readFile("store/publisher.json", "utf8"));
const outstanding = [];
if (!publisher.publisherName)
  outstanding.push("Supply the publisher name in the developer account.");
if (!publisher.supportEmail)
  outstanding.push("Supply and verify a public support contact.");
for (const field of ["homepageUrl", "privacyPolicyUrl", "supportUrl"]) {
  if (!/^https:\/\//.test(publisher[field] || ""))
    outstanding.push(`Set ${field} to the publicly hosted HTTPS page.`);
}
const report = {
  version: manifest.version,
  archive,
  sha256: checksum,
  archiveBytes: data.length,
  fileCount: files.length,
  screenshotCount: screenshots.length,
  packageChecks: "passed",
  submissionStatus: outstanding.length
    ? "Publisher details and public URLs needed"
    : "Ready for publisher dashboard review",
  outstanding,
  notPerformed: [
    "Chrome Web Store account verification",
    "Public URL reachability and ownership verification",
    "Dashboard upload or submission",
    "Chrome Web Store review approval",
  ],
};
await writeFile(
  "release/READINESS.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--strict") && outstanding.length)
  process.exitCode = 2;
