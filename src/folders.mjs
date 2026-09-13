import { uid, COLORS } from "./model.mjs";

export function createFolder(name, color = COLORS[3].value) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100)
    throw new Error("Use a folder name between 1 and 100 characters.");
  return {
    id: uid(),
    name: trimmed,
    color,
    documentIds: [],
    annotationIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function folderContents(folder, library) {
  const documents = new Set(folder.documentIds);
  const annotations = new Set(folder.annotationIds);
  return {
    documents: library.documents.filter((d) => documents.has(d.id)),
    annotations: library.annotations.filter(
      (a) => documents.has(a.documentId) || annotations.has(a.id),
    ),
  };
}

export function setMembership(folder, kind, id, included) {
  const field = kind === "doc" ? "documentIds" : "annotationIds";
  const ids = new Set(folder[field]);
  if (included) ids.add(id);
  else ids.delete(id);
  return { ...folder, [field]: [...ids], updatedAt: new Date().toISOString() };
}
