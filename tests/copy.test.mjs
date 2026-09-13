import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatCount } from "../src/model.mjs";

test("item counts use singular and plural labels", () => {
  assert.equal(formatCount(0, "reading"), "0 readings");
  assert.equal(formatCount(1, "annotation"), "1 annotation");
  assert.equal(formatCount(2, "folder"), "2 folders");
});

test("student-facing title and listing match the extension manifest", async () => {
  const manifest = JSON.parse(
    await readFile("extension/manifest.json", "utf8"),
  );
  assert.equal(manifest.name, "Marginalia — Study Notes & Highlights");
  const listing = await readFile("store/LISTING.md", "utf8");
  assert.ok(listing.includes(manifest.name));
  assert.ok(listing.includes(manifest.description));
  assert.ok(manifest.description.length <= 132);
  for (const file of [
    "index.html",
    "public/about.html",
    "extension/popup.html",
  ]) {
    const html = await readFile(file, "utf8");
    assert.ok(html.includes("Marginalia — Study Notes &amp; Highlights"), file);
  }
});

test("interface copy no longer contains the old promotional slogans", async () => {
  for (const file of [
    "src/App.jsx",
    "src/Reader.jsx",
    "src/Folders.jsx",
    "extension/content.js",
    "extension/popup.html",
    "public/about.html",
    "public/help.html",
    "public/privacy.html",
    "scripts/store-art.mjs",
  ]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /between the lines|your reading, remembered|a thoughtful home|what resonates|every thought, a thread|a place for every curiosity|a little space, just for you/i,
      file,
    );
  }
});
