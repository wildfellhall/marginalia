import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
for (const file of [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "background.js",
])
  await copyFile(`extension/${file}`, `dist/${file}`);
await build({
  entryPoints: ["extension/content.js"],
  outfile: "dist/content.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: "chrome140",
});
await import("./third-party-notices.mjs");
console.log(
  "Marginalia extension ready in dist/. Load this folder in Chrome or Edge.",
);
