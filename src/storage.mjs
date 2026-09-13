const PREFIX = "marginalia:";
export const isExtension = () => Boolean(globalThis.chrome?.runtime?.id);
export async function readLibrary() {
  const all = isExtension()
    ? await chrome.storage.local.get(null)
    : Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => k.startsWith(PREFIX))
          .map((k) => [k, JSON.parse(localStorage.getItem(k))]),
      );
  return {
    documents: Object.entries(all)
      .filter(([k]) => k.startsWith(PREFIX + "doc:"))
      .map(([, v]) => v),
    annotations: Object.entries(all)
      .filter(([k]) => k.startsWith(PREFIX + "ann:"))
      .map(([, v]) => v),
    folders: Object.entries(all)
      .filter(([k]) => k.startsWith(PREFIX + "folder:"))
      .map(([, v]) => v),
  };
}
export async function putRecord(type, record) {
  const key = PREFIX + type + ":" + record.id;
  if (isExtension()) await chrome.storage.local.set({ [key]: record });
  else localStorage.setItem(key, JSON.stringify(record));
}
export async function deleteRecord(type, id) {
  if (type === "ann" || type === "doc") {
    const field = type === "ann" ? "annotationIds" : "documentIds";
    const { folders } = await readLibrary();
    for (const folder of folders) {
      if (folder[field].includes(id))
        await putRecord("folder", {
          ...folder,
          [field]: folder[field].filter((value) => value !== id),
          updatedAt: new Date().toISOString(),
        });
    }
  }
  const key = PREFIX + type + ":" + id;
  if (isExtension()) await chrome.storage.local.remove(key);
  else localStorage.removeItem(key);
}
export async function clearLibrary() {
  const database = await db();
  await new Promise((resolve, reject) => {
    const tx = database.transaction("files", "readwrite");
    tx.objectStore("files").clear();
    tx.oncomplete = () => {
      database.close();
      resolve();
    };
    tx.onerror = () => {
      database.close();
      reject(tx.error);
    };
  });
  const belongsToLibrary = (key) =>
    key.startsWith(PREFIX + "doc:") ||
    key.startsWith(PREFIX + "ann:") ||
    key.startsWith(PREFIX + "folder:");
  if (isExtension()) {
    const records = await chrome.storage.local.get(null);
    await chrome.storage.local.remove(
      Object.keys(records).filter(belongsToLibrary),
    );
    await chrome.storage.local.set({ [PREFIX + "initialized"]: true });
  } else {
    Object.keys(localStorage)
      .filter(belongsToLibrary)
      .forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(PREFIX + "initialized", "true");
  }
}
export function subscribe(callback) {
  if (isExtension()) {
    const listener = (_, area) => area === "local" && callback();
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("marginalia-files", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function fileStore(action, id, value) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(
      "files",
      action === "get" ? "readonly" : "readwrite",
    );
    const store = tx.objectStore("files");
    const req =
      action === "get"
        ? store.get(id)
        : action === "put"
          ? store.put(value, id)
          : store.delete(id);
    tx.oncomplete = () => {
      resolve(req.result);
      database.close();
    };
    tx.onerror = () => {
      reject(tx.error);
      database.close();
    };
  });
}
export async function exportLibrary(library) {
  const files = [];
  for (const d of library.documents.filter((d) => d.format === "PDF")) {
    const blob = await fileStore("get", d.id);
    if (blob) {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      files.push({ id: d.id, base64 });
    }
  }
  const blob = new Blob(
    [
      JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), ...library, files },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `marginalia-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
