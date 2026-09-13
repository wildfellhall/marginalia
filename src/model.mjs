export const COLORS = [
  { name: "Butter", value: "#f2dfa0" },
  { name: "Rose", value: "#edc9ce" },
  { name: "Sage", value: "#cbdcc4" },
  { name: "Lavender", value: "#dbd1eb" },
  { name: "Sky", value: "#c9dfea" },
  { name: "Peach", value: "#f2ceb1" },
];
export const TYPES = [
  "highlight",
  "underline",
  "margin",
  "sticky",
  "flag",
  "tab",
  "bookmark",
];
export const TYPE_NAMES = {
  highlight: "Highlight",
  underline: "Underline",
  margin: "Margin note",
  sticky: "Sticky note",
  flag: "Flag",
  tab: "Tab",
  bookmark: "Bookmark",
};
export const uid = () => crypto.randomUUID();
export const formatCount = (count, noun) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;
export const canonicalUrl = (value) => {
  const url = new URL(value);
  url.hash = "";
  return url.href;
};
export function searchAnnotations(annotations, query, filters = {}) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return annotations.filter(
    (a) =>
      (!filters.type || a.type === filters.type) &&
      (!filters.label || a.labels.includes(filters.label)) &&
      (!filters.color || a.color === filters.color) &&
      words.every((word) =>
        [a.quote, a.note, a.documentTitle, ...a.labels]
          .join(" ")
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
}
export function resolveAnchor(text, anchor) {
  if (!anchor?.exact) return null;
  const { exact, start, prefix = "", suffix = "" } = anchor;
  if (
    Number.isInteger(start) &&
    text.slice(start, start + exact.length) === exact &&
    (!prefix ||
      text.slice(Math.max(0, start - prefix.length), start) === prefix)
  )
    return { start, end: start + exact.length };
  let from = 0,
    best = null,
    bestScore = -1;
  while (from <= text.length) {
    const index = text.indexOf(exact, from);
    if (index === -1) break;
    const score =
      (prefix &&
      text.slice(Math.max(0, index - prefix.length), index) === prefix
        ? 2
        : 0) +
      (suffix &&
      text.slice(index + exact.length, index + exact.length + suffix.length) ===
        suffix
        ? 2
        : 0);
    if (score > bestScore) {
      best = { start: index, end: index + exact.length };
      bestScore = score;
    }
    from = index + 1;
  }
  return best;
}
export function validateBackup(data) {
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.documents) ||
    !Array.isArray(data.annotations)
  )
    throw new Error("This is not a Marginalia backup.");
  if (data.documents.length > 10000 || data.annotations.length > 100000)
    throw new Error("This backup is too large.");
  const safeString = (s, max = 20000000) =>
    typeof s === "string" && s.length <= max;
  const ids = new Set(),
    annotationIds = new Set();
  const validOptionalString = (object, key, max = 2000) =>
    object[key] === undefined || safeString(object[key], max);
  for (const d of data.documents) {
    if (
      !safeString(d.id, 200) ||
      !safeString(d.title, 2000) ||
      !["EPUB", "PDF", "Article", "Website"].includes(d.format) ||
      (d.html !== undefined && !safeString(d.html)) ||
      (d.url && (!safeString(d.url, 10000) || !/^https?:\/\//.test(d.url))) ||
      !["author", "theme", "createdAt", "updatedAt", "lastOpened"].every(
        (key) => validOptionalString(d, key),
      )
    )
      throw new Error("A document in this backup is invalid.");
    if (ids.has(d.id))
      throw new Error("The backup contains duplicate document IDs.");
    ids.add(d.id);
  }
  for (const a of data.annotations) {
    if (
      !safeString(a.id, 200) ||
      !ids.has(a.documentId) ||
      !TYPES.includes(a.type) ||
      !safeString(a.quote, 100000) ||
      !safeString(a.note, 100000) ||
      !Array.isArray(a.labels) ||
      a.labels.length > 100 ||
      !a.labels.every((l) => safeString(l, 100)) ||
      !/^#[0-9a-f]{6}$/i.test(a.color)
    )
      throw new Error("An annotation in this backup is invalid.");
    if (
      annotationIds.has(a.id) ||
      !["documentTitle", "createdAt", "updatedAt"].every((key) =>
        validOptionalString(a, key),
      ) ||
      (a.page !== undefined && (!Number.isInteger(a.page) || a.page < 1)) ||
      (a.scrollY !== undefined &&
        (!Number.isFinite(a.scrollY) || a.scrollY < 0))
    )
      throw new Error("An annotation has invalid metadata.");
    annotationIds.add(a.id);
    if (
      a.anchor &&
      (!safeString(a.anchor.exact, 100000) ||
        !Number.isInteger(a.anchor.start) ||
        a.anchor.start < 0 ||
        !safeString(a.anchor.prefix || "", 100) ||
        !safeString(a.anchor.suffix || "", 100))
    )
      throw new Error("An annotation position is invalid.");
  }
  if (data.folders !== undefined) {
    if (!Array.isArray(data.folders) || data.folders.length > 10000)
      throw new Error("The backup contains invalid folders.");
    const folderIds = new Set();
    for (const f of data.folders) {
      if (
        !f ||
        !safeString(f.id, 200) ||
        !f.id ||
        folderIds.has(f.id) ||
        !safeString(f.name, 100) ||
        !f.name.trim() ||
        !/^#[0-9a-f]{6}$/i.test(f.color) ||
        !Array.isArray(f.documentIds) ||
        f.documentIds.length > 10000 ||
        !f.documentIds.every((id) => ids.has(id)) ||
        new Set(f.documentIds).size !== f.documentIds.length ||
        !Array.isArray(f.annotationIds) ||
        f.annotationIds.length > 100000 ||
        !f.annotationIds.every((id) => annotationIds.has(id)) ||
        new Set(f.annotationIds).size !== f.annotationIds.length ||
        !["createdAt", "updatedAt"].every((key) => validOptionalString(f, key))
      )
        throw new Error("A folder in this backup is invalid.");
      folderIds.add(f.id);
    }
  }
  if (
    data.files !== undefined &&
    (!Array.isArray(data.files) ||
      data.files.some(
        (f) =>
          !ids.has(f.id) ||
          !safeString(f.base64, 150000000) ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(f.base64),
      ))
  )
    throw new Error("An attached file is invalid.");
  return data;
}
