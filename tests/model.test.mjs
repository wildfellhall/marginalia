import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalUrl,
  resolveAnchor,
  searchAnnotations,
  validateBackup,
} from "../src/model.mjs";
test("a passage is restored when surrounding content moves", () => {
  const text = "New introduction. Before a beautiful sentence. After";
  const found = resolveAnchor(text, {
    start: 7,
    exact: "a beautiful sentence.",
    prefix: "Before ",
    suffix: " After",
  });
  assert.deepEqual(found, { start: 25, end: 46 });
});
test("context chooses the right occurrence of a repeated quote", () => {
  const text = "first: the same words. second: the same words.";
  const found = resolveAnchor(text, {
    start: 999,
    exact: "the same words.",
    prefix: "second: ",
  });
  assert.equal(found.start, text.lastIndexOf("the same words."));
});
test("removed passages do not attach to unrelated text", () => {
  assert.equal(
    resolveAnchor("Something new", { exact: "Old passage", start: 0 }),
    null,
  );
});
test("search combines highlighted words, notes and labels with filters", () => {
  const records = [
    {
      id: "a",
      quote: "An opening sentence",
      note: "Social satire",
      labels: ["Beautiful writing"],
      type: "highlight",
      color: "#f2dfa0",
      documentTitle: "Pride and Prejudice",
    },
    {
      id: "b",
      quote: "A garden",
      note: "",
      labels: ["Nature"],
      type: "bookmark",
      color: "#cbdcc4",
    },
  ];
  assert.deepEqual(
    searchAnnotations(records, "OPENING beautiful").map((a) => a.id),
    ["a"],
  );
  assert.equal(
    searchAnnotations(records, "", { label: "Nature", type: "bookmark" })
      .length,
    1,
  );
  assert.equal(
    searchAnnotations(records, "", { label: "Nature", type: "highlight" })
      .length,
    0,
  );
});
test("canonical page URLs preserve meaningful queries but remove fragments", () => {
  assert.equal(
    canonicalUrl("https://example.com/article?chapter=2#para"),
    "https://example.com/article?chapter=2",
  );
});
test("backup rejects orphan annotations and unsafe fields", () => {
  const d = { id: "d", title: "Book", format: "EPUB" };
  const a = {
    id: "a",
    documentId: "d",
    quote: "text",
    note: "note",
    type: "highlight",
    labels: ["Ideas"],
    color: "#f2dfa0",
  };
  assert.equal(
    validateBackup({ version: 1, documents: [d], annotations: [a] }).annotations
      .length,
    1,
  );
  assert.throws(() =>
    validateBackup({ version: 1, documents: [], annotations: [a] }),
  );
  assert.throws(() =>
    validateBackup({
      version: 1,
      documents: [d],
      annotations: [{ ...a, color: "red;display:none" }],
    }),
  );
  assert.throws(() =>
    validateBackup({
      version: 1,
      documents: [{ ...d, url: "javascript:alert(1)" }],
      annotations: [],
    }),
  );
});
