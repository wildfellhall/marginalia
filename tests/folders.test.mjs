import test from "node:test";
import assert from "node:assert/strict";
import {
  createFolder,
  folderContents,
  setMembership,
} from "../src/folders.mjs";
import { validateBackup } from "../src/model.mjs";
import { readLibrary, putRecord, deleteRecord } from "../src/storage.mjs";

const doc = { id: "d", title: "Book", format: "EPUB" };
const annotation = {
  id: "a",
  documentId: "d",
  quote: "A thought",
  note: "",
  labels: [],
  color: "#f2dfa0",
  type: "highlight",
};
test("folders include book annotations automatically and deduplicate individual notes", () => {
  const folder = {
    ...createFolder(" Favorites "),
    documentIds: ["d"],
    annotationIds: ["a"],
  };
  assert.equal(folder.name, "Favorites");
  const library = {
    documents: [doc],
    annotations: [annotation, { ...annotation, id: "future" }],
  };
  assert.equal(folderContents(folder, library).annotations.length, 2);
  const removed = setMembership(folder, "doc", "d", false);
  assert.equal(folderContents(removed, library).documents.length, 0);
  assert.deepEqual(
    folderContents(removed, library).annotations.map((a) => a.id),
    ["a"],
  );
  assert.deepEqual(folder.documentIds, ["d"]);
  assert.throws(() => createFolder("  "));
  assert.throws(() => createFolder("a".repeat(101)));
});
test("membership updates are immutable and idempotent", () => {
  const folder = createFolder("Ideas");
  const added = setMembership(
    setMembership(folder, "ann", "a", true),
    "ann",
    "a",
    true,
  );
  assert.deepEqual(added.annotationIds, ["a"]);
  assert.deepEqual(folder.annotationIds, []);
  assert.deepEqual(setMembership(added, "ann", "a", false).annotationIds, []);
});
test("backups accept old libraries and validate folder names, IDs, colors and references", () => {
  const backup = { version: 1, documents: [doc], annotations: [annotation] };
  const folder = {
    ...createFolder("Ideas"),
    documentIds: ["d"],
    annotationIds: ["a"],
  };
  assert.equal(validateBackup(backup), backup);
  assert.equal(
    validateBackup({ ...backup, folders: [folder] }).folders.length,
    1,
  );
  for (const change of [
    { name: " " },
    { name: "x".repeat(101) },
    { color: "red" },
    { id: "" },
    { documentIds: ["missing"] },
    { annotationIds: ["missing"] },
    { documentIds: ["d", "d"] },
    { annotationIds: null },
    { updatedAt: {} },
  ])
    assert.throws(() =>
      validateBackup({ ...backup, folders: [{ ...folder, ...change }] }),
    );
  for (const folders of [null, {}, [null], [folder, folder]])
    assert.throws(() => validateBackup({ ...backup, folders }));
});
test("stored folders survive reads; deleting notes cleans references; deleting folders preserves content", async () => {
  const records = {};
  globalThis.chrome = {
    runtime: { id: "test" },
    storage: {
      local: {
        get: async () => structuredClone(records),
        set: async (values) => Object.assign(records, structuredClone(values)),
        remove: async (key) => {
          delete records[key];
        },
      },
    },
  };
  try {
    await putRecord("doc", doc);
    await putRecord("ann", annotation);
    const folder = {
      ...createFolder("Stored"),
      documentIds: ["d"],
      annotationIds: ["a"],
    };
    await putRecord("folder", folder);
    assert.deepEqual((await readLibrary()).folders, [folder]);
    await deleteRecord("ann", "a");
    let library = await readLibrary();
    assert.deepEqual(library.folders[0].annotationIds, []);
    validateBackup({ version: 1, ...library });
    await putRecord("ann", annotation);
    await deleteRecord("folder", folder.id);
    library = await readLibrary();
    assert.equal(library.folders.length, 0);
    assert.deepEqual(library.documents, [doc]);
    assert.deepEqual(library.annotations, [annotation]);
  } finally {
    delete globalThis.chrome;
  }
});
