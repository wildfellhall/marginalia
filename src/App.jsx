import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderHeart,
  Grid2X2,
  Highlighter,
  Leaf,
  Library,
  List,
  Loader2,
  Plus,
  Search,
  Settings2,
  Tag,
  Upload,
  X,
} from "lucide-react";
import {
  AnnotationCard,
  BookArt,
  Logo,
  Modal,
  ReadingIllustration,
  TYPE_ICONS,
  ColorPicker,
} from "./components.jsx";
import {
  COLORS,
  formatCount,
  TYPES,
  TYPE_NAMES,
  canonicalUrl,
  searchAnnotations,
  uid,
  validateBackup,
} from "./model.mjs";
import {
  clearLibrary,
  deleteRecord,
  exportLibrary,
  fileStore,
  isExtension,
  putRecord,
  readLibrary,
  subscribe,
} from "./storage.mjs";
import { demoLibrary } from "./demo.mjs";
import { importDocument } from "./importers.mjs";
import Reader from "./Reader.jsx";
import { FolderEditor, FolderPicker, FoldersView } from "./Folders.jsx";
import { setMembership } from "./folders.mjs";

export default function App() {
  const [library, setLibrary] = useState({
      documents: [],
      annotations: [],
      folders: [],
    }),
    [ready, setReady] = useState(false);
  const [view, setView] = useState("library"),
    [query, setQuery] = useState(""),
    [format, setFormat] = useState("All reading"),
    [sort, setSort] = useState("recent"),
    [layout, setLayout] = useState("grid");
  const [activeLabel, setActiveLabel] = useState(""),
    [typeFilter, setTypeFilter] = useState(""),
    [modal, setModal] = useState(null),
    [reader, setReader] = useState(null),
    [jump, setJump] = useState(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [importTab, setImportTab] = useState("file"),
    [url, setUrl] = useState(""),
    [editing, setEditing] = useState(null),
    [deleteTarget, setDeleteTarget] = useState(null);
  const fileInput = useRef(),
    restoreInput = useRef(),
    toastTimer = useRef();
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [folderEditor, setFolderEditor] = useState(null);
  const [organizing, setOrganizing] = useState(null);
  const activeFolder = library.folders.find((f) => f.id === activeFolderId);
  const refresh = async () => setLibrary(await readLibrary());
  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  };
  useEffect(() => {
    let alive = true;
    readLibrary()
      .then(async (data) => {
        const initialized = isExtension()
          ? (await chrome.storage.local.get("marginalia:initialized"))[
              "marginalia:initialized"
            ]
          : localStorage.getItem("marginalia:initialized");
        if (!initialized && !data.documents.length) {
          data = { ...demoLibrary(), folders: data.folders };
          for (const d of data.documents) await putRecord("doc", d);
          for (const a of data.annotations) await putRecord("ann", a);
        }
        if (isExtension())
          await chrome.storage.local.set({ "marginalia:initialized": true });
        else localStorage.setItem("marginalia:initialized", "true");
        if (alive) {
          setLibrary(data);
          setReady(true);
          const id = new URLSearchParams(location.search).get("document");
          if (id) setReader(data.documents.find((d) => d.id === id) || null);
        }
      })
      .catch((e) => {
        setError(`Could not open your library: ${e.message}`);
        setReady(true);
      });
    const unsub = subscribe(refresh);
    return () => {
      alive = false;
      unsub();
      clearTimeout(toastTimer.current);
    };
  }, []);
  const labels = useMemo(
    () => [...new Set(library.annotations.flatMap((a) => a.labels))].sort(),
    [library.annotations],
  );
  const navigate = (next, label = "") => {
    setActiveFolderId(null);
    setView(next);
    setActiveLabel(label);
    setQuery("");
    setTypeFilter("");
  };
  const annotations = searchAnnotations(library.annotations, query, {
    type: view === "bookmarks" ? "bookmark" : typeFilter,
    label: activeLabel,
  }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const documents = library.documents
    .filter(
      (d) =>
        (format === "All reading" || d.format === format) &&
        (!query ||
          [
            d.title,
            d.author,
            ...library.annotations
              .filter((a) => a.documentId === d.id)
              .flatMap((a) => [a.quote, a.note, ...a.labels]),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (b.lastOpened || b.createdAt || "").localeCompare(
            a.lastOpened || a.createdAt || "",
          ),
    );
  const openDocument = async (doc, annotation = null) => {
    if (!doc) return;
    if (!doc.html && doc.format !== "PDF" && doc.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
      return;
    }
    setReader(doc);
    setJump(annotation);
    await putRecord("doc", { ...doc, lastOpened: new Date().toISOString() });
    await refresh();
  };
  const openAnnotation = (a) =>
    openDocument(
      library.documents.find((d) => d.id === a.documentId),
      a,
    );
  const saveAnnotation = async (a) => {
    try {
      await putRecord("ann", a);
      await refresh();
      setEditing(null);
      notify("Annotation saved.");
    } catch (e) {
      notify(`Could not save: ${e.message}`);
      throw e;
    }
  };
  const openImport = () => {
    setModal("import");
    setImportTab("file");
    setError("");
  };
  const handleFiles = async (files) => {
    if (!files.length) return;
    setBusy(true);
    setError("");
    let count = 0;
    try {
      for (const file of files) {
        const doc = await importDocument(file);
        await putRecord("doc", doc);
        count++;
      }
      await refresh();
      setModal(null);
      notify(
        `${count} ${count === 1 ? "reading" : "readings"} added to your library.`,
      );
    } catch (e) {
      setError(e.message);
      await refresh();
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const saveUrl = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const address = canonicalUrl(url);
      if (!/^https?:\/\//.test(address))
        throw new Error("Use an http or https website address.");
      const existing = library.documents.find((d) => d.url === address);
      if (existing) {
        setModal(null);
        await openDocument(existing);
        return;
      }
      const doc = {
        id: uid(),
        title: new URL(address).hostname.replace("www.", ""),
        author: address,
        url: address,
        format: "Website",
        theme: "sage",
        createdAt: new Date().toISOString(),
      };
      await putRecord("doc", doc);
      await refresh();
      setModal(null);
      setUrl("");
      notify("Website saved. Open it and use the extension to annotate.");
    } catch (e) {
      setError(e.message);
    }
  };
  const restore = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 150 * 1024 * 1024)
        throw new Error("Please use a backup smaller than 150 MB.");
      const data = validateBackup(JSON.parse(await file.text()));
      // Merge backups without replacing a newer local record with an older copy.
      for (const d of data.documents) {
        const current = library.documents.find((v) => v.id === d.id);
        if (
          !current ||
          (d.updatedAt || d.createdAt || "") >
            (current.updatedAt || current.createdAt || "")
        )
          await putRecord("doc", d);
      }
      for (const a of data.annotations) {
        const current = library.annotations.find((v) => v.id === a.id);
        if (
          !current ||
          (a.updatedAt || a.createdAt || "") >
            (current.updatedAt || current.createdAt || "")
        )
          await putRecord("ann", a);
      }
      for (const f of data.files || []) {
        if (!(await fileStore("get", f.id)))
          await fileStore(
            "put",
            f.id,
            new Blob(
              [Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0))],
              { type: "application/pdf" },
            ),
          );
      }
      for (const folder of data.folders || []) {
        const current = library.folders.find((f) => f.id === folder.id);
        if (
          !current ||
          (folder.updatedAt || folder.createdAt || "") >
            (current.updatedAt || current.createdAt || "")
        )
          await putRecord("folder", folder);
      }
      await refresh();
      notify("Backup merged into your library.");
      setModal(null);
    } catch (e) {
      setError(`Could not import backup: ${e.message}`);
    } finally {
      setBusy(false);
      if (restoreInput.current) restoreInput.current.value = "";
    }
  };
  const remove = async () => {
    try {
      await deleteRecord("ann", deleteTarget.id);
      await refresh();
      setDeleteTarget(null);
      notify("Annotation deleted.");
    } catch (e) {
      notify(e.message);
    }
  };
  const title = {
    library: "Your library",
    annotations: "All annotations",
    bookmarks: "Bookmarks",
    labels: "Labels",
    folders: "Folders",
  }[view];
  const openFolder = (id) => {
    navigate("folders");
    setActiveFolderId(id);
  };
  const organizeAnnotation = (record) => setOrganizing({ kind: "ann", record });
  const folderDialogs = (
    <>
      {folderEditor && (
        <FolderEditor
          folder={folderEditor.id ? folderEditor : null}
          onClose={() => setFolderEditor(null)}
          onSave={async (folder) => {
            const latest = await readLibrary();
            const current = latest.folders.find((f) => f.id === folder.id);
            if (folderEditor.id && !current)
              throw new Error("This folder was deleted in another window.");
            await putRecord(
              "folder",
              current
                ? {
                    ...current,
                    name: folder.name,
                    color: folder.color,
                    updatedAt: folder.updatedAt,
                  }
                : folder,
            );
            await refresh();
            setFolderEditor(null);
            notify("Folder saved.");
          }}
        />
      )}
      {organizing && (
        <FolderPicker
          folders={library.folders}
          target={organizing}
          onClose={() => setOrganizing(null)}
          onSave={async (drafts, selected, original) => {
            const latest = await readLibrary();
            const { kind, record } = organizing;
            const field = kind === "doc" ? "documentIds" : "annotationIds";
            if (
              !(kind === "doc" ? latest.documents : latest.annotations).some(
                (r) => r.id === record.id,
              )
            )
              throw new Error("This item was deleted in another window.");
            for (const folder of drafts) {
              const before = original.find((f) => f.id === folder.id);
              if (
                before &&
                before[field].includes(record.id) ===
                  selected.includes(folder.id)
              )
                continue;
              const current = latest.folders.find((f) => f.id === folder.id);
              if (before && !current)
                throw new Error(
                  "A folder was deleted in another window. Close this dialog and try again.",
                );
              await putRecord(
                "folder",
                setMembership(
                  current || folder,
                  kind,
                  record.id,
                  selected.includes(folder.id),
                ),
              );
            }
            await refresh();
            setOrganizing(null);
            notify("Folder organization saved.");
          }}
        />
      )}
    </>
  );
  if (reader)
    return (
      <>
        <Reader
          document={reader}
          annotations={library.annotations.filter(
            (a) => a.documentId === reader.id,
          )}
          onBack={() => {
            setReader(null);
            setJump(null);
          }}
          onSave={saveAnnotation}
          onEdit={setEditing}
          onDelete={setDeleteTarget}
          onOrganize={setOrganizing}
          initialJump={jump}
        />
        {folderDialogs}
        {editing && (
          <AnnotationEditor
            annotation={editing}
            labels={labels}
            onClose={() => setEditing(null)}
            onSave={saveAnnotation}
          />
        )}
        <DeleteDialog
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={remove}
        />
        {toast && (
          <div className="toast" role="status">
            <Check size={16} />
            {toast}
          </div>
        )}
      </>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="sidebar-caption">STUDY NOTES & HIGHLIGHTS</div>
        <nav aria-label="Main navigation">
          <span className="nav-heading">WORKSPACE</span>
          {[
            ["library", Library, "My library", library.documents.length],
            [
              "annotations",
              Highlighter,
              "All annotations",
              library.annotations.length,
            ],
            [
              "bookmarks",
              Bookmark,
              "Bookmarks",
              library.annotations.filter((a) => a.type === "bookmark").length,
            ],
            ["labels", Tag, "My labels", labels.length],
            ["folders", FolderHeart, "My folders", library.folders.length],
          ].map(([key, Icon, label, count]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`nav-item ${view === key && !activeLabel ? "active" : ""}`}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{label}</span>
              <span className="nav-count">{count}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-folders">
          <div className="nav-heading">
            YOUR FOLDERS
            <button
              className="icon-button"
              aria-label="Create folder"
              onClick={() => setFolderEditor({})}
            >
              <Plus size={15} />
            </button>
          </div>
          {[...library.folders]
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 6)
            .map((folder) => (
              <button
                key={folder.id}
                className={`label-nav ${activeFolderId === folder.id ? "selected" : ""}`}
                onClick={() => openFolder(folder.id)}
              >
                <FolderHeart
                  size={16}
                  style={{ fill: folder.color, flexShrink: 0 }}
                />
                <span className="folder-nav-name">{folder.name}</span>
              </button>
            ))}
          {!library.folders.length && (
            <p className="sidebar-hint">
              Organize readings and notes by course or assignment.
            </p>
          )}
        </div>
        <div className="sidebar-labels">
          <div className="nav-heading">
            YOUR LABELS
            <Tag size={13} />
          </div>
          {labels.slice(0, 7).map((label, i) => (
            <button
              className={`label-nav ${activeLabel === label ? "selected" : ""}`}
              key={label}
              onClick={() => navigate("annotations", label)}
            >
              <span
                className="label-dot"
                style={{ background: COLORS[i % COLORS.length].value }}
              />
              {label}
              <span>
                {
                  library.annotations.filter((a) => a.labels.includes(label))
                    .length
                }
              </span>
            </button>
          ))}
          {!labels.length && (
            <p className="sidebar-hint">
              Label annotations by topic to find them later.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Leaf size={19} strokeWidth={1.3} />
            <p>
              Back up
              <br />
              your notes.
            </p>
            <span>Export a copy in Settings & backup.</span>
          </div>
          <button
            className="nav-item settings-button"
            onClick={() => {
              setModal("settings");
              setError("");
            }}
          >
            <Settings2 size={17} />
            <span>Settings & backup</span>
          </button>
          <div className="storage-status">
            <span />
            Saved on this device
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Your workspace</span>
            <ChevronRight size={13} />
            <span>
              {activeFolder?.name ||
                activeLabel ||
                {
                  library: "My library",
                  annotations: "All annotations",
                  bookmarks: "Bookmarks",
                  labels: "My labels",
                  folders: "My folders",
                }[view]}
            </span>
          </div>
          <div className="topbar-right">
            <span className="private-note">
              <span />
              Stored on this device
            </span>
            <button
              className="avatar"
              title="Settings and backup"
              onClick={() => setModal("settings")}
            >
              <FlowerMark />
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">MARGINALIA</div>
              <h1>{activeFolder?.name || activeLabel || title}</h1>
              <p>
                {view === "folders"
                  ? "Organize readings and annotations by course, assignment, or topic."
                  : view === "library"
                    ? "Your books, articles, PDFs, and reading notes."
                    : view === "bookmarks"
                      ? "Return to pages and passages you saved."
                      : view === "labels"
                        ? "Find annotations by topic or what you need to review."
                        : "Search highlights and notes across your readings."}
              </p>
            </div>
            <button
              className="button primary"
              onClick={
                view === "folders" ? () => setFolderEditor({}) : openImport
              }
            >
              <Plus size={17} />
              {view === "folders" ? "New folder" : "Add reading"}
            </button>
          </div>
          {view === "library" && !query && (
            <section className="welcome-banner">
              <div>
                <span className="eyebrow">READING WORKSPACE</span>
                <h2>
                  Your readings
                  <br />
                  <em>and notes.</em>
                </h2>
                <p>
                  Mark key passages and add questions as you read.
                  <br />
                  Find them later when you write or review.
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    openDocument(
                      [...library.documents].sort((a, b) =>
                        (b.lastOpened || b.createdAt || "").localeCompare(
                          a.lastOpened || a.createdAt || "",
                        ),
                      )[0],
                    )
                  }
                >
                  Continue reading <ArrowUpRight size={16} />
                </button>
              </div>
              <ReadingIllustration />
              <span className="banner-stamp">
                PDF · EPUB
                <br />
                WEB · TEXT<span>✧</span>
              </span>
            </section>
          )}
          <div className="collection-toolbar">
            <div className="collection-tabs">
              {view === "library" ? (
                ["All reading", "EPUB", "PDF", "Article", "Website"].map(
                  (f) => (
                    <button
                      key={f}
                      className={format === f ? "active" : ""}
                      onClick={() => setFormat(f)}
                    >
                      {f === "EPUB"
                        ? "Books"
                        : f === "PDF"
                          ? "PDFs"
                          : f === "Article"
                            ? "Articles"
                            : f === "Website"
                              ? "Websites"
                              : f}
                      {f === "All reading" && (
                        <span>{library.documents.length}</span>
                      )}
                    </button>
                  ),
                )
              ) : (
                <h2>
                  {view === "folders"
                    ? activeFolder
                      ? "Inside this folder"
                      : "Your folders"
                    : view === "labels"
                      ? "Your labels"
                      : activeLabel
                        ? "Labeled annotations"
                        : view === "bookmarks"
                          ? "Saved places"
                          : "Your annotations"}
                  {!(view === "folders" && activeFolder) && (
                    <span className="section-count">
                      {view === "folders"
                        ? activeFolder
                          ? null
                          : library.folders.length
                        : view === "labels"
                          ? labels.length
                          : annotations.length}
                    </span>
                  )}
                </h2>
              )}
            </div>
            <div className="view-controls">
              {view === "library" && (
                <>
                  <label className="sort-control">
                    <select
                      aria-label="Sort reading"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Recently opened</option>
                      <option value="title">Title, A–Z</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
                  <div className="layout-toggle">
                    <button
                      aria-label="Grid view"
                      aria-pressed={layout === "grid"}
                      className={layout === "grid" ? "active" : ""}
                      onClick={() => setLayout("grid")}
                    >
                      <Grid2X2 size={15} />
                    </button>
                    <button
                      aria-label="List view"
                      aria-pressed={layout === "list"}
                      className={layout === "list" ? "active" : ""}
                      onClick={() => setLayout("list")}
                    >
                      <List size={17} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="search-row">
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="Search library and annotations"
                placeholder={
                  view === "folders"
                    ? activeFolder
                      ? "Search this folder’s books, notes, highlights, or labels…"
                      : "Search folder names…"
                    : view === "library"
                      ? "Search your books, notes, highlights, or labels…"
                      : "Search highlighted words, notes, or labels…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
              <kbd>⌕</kbd>
            </div>
            {view === "annotations" && (
              <select
                className="filter-select"
                aria-label="Annotation type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All annotation types</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_NAMES[t]}
                  </option>
                ))}
              </select>
            )}
            <span className="search-caption">
              {view === "folders"
                ? "Folders on this device"
                : view === "library"
                  ? formatCount(documents.length, "reading")
                  : formatCount(annotations.length, "annotation")}
            </span>
          </div>
          {!ready ? (
            <div className="empty-state">
              <Loader2 className="spin" />
              Opening your library…
            </div>
          ) : view === "folders" ? (
            <FoldersView
              key={activeFolder?.id || "all-folders"}
              library={library}
              activeFolder={activeFolder}
              query={query}
              onOpenFolder={openFolder}
              onCreate={() => setFolderEditor({})}
              onEditFolder={setFolderEditor}
              onDeleteFolder={async (folder) => {
                await deleteRecord("folder", folder.id);
                await refresh();
                openFolder(null);
                notify("Folder deleted. Your books and annotations are safe.");
              }}
              onOpenDocument={openDocument}
              onOpenAnnotation={openAnnotation}
              onEditAnnotation={setEditing}
              onDeleteAnnotation={setDeleteTarget}
              onOrganize={setOrganizing}
              onRemove={async (folder, kind, id) => {
                const latest = (await readLibrary()).folders.find(
                  (f) => f.id === folder.id,
                );
                if (latest)
                  await putRecord(
                    "folder",
                    setMembership(latest, kind, id, false),
                  );
                await refresh();
                notify("Removed from folder. Still in your library.");
              }}
            />
          ) : view === "library" ? (
            <>
              <div
                className={`book-grid ${layout === "list" ? "list-layout" : ""}`}
              >
                {documents.map((doc) => (
                  <div className="book-entry" key={doc.id}>
                    <button
                      className="book-card"
                      key={doc.id}
                      onClick={() => openDocument(doc)}
                    >
                      <div className="cover-wrap">
                        <BookArt
                          variant={doc.theme || "sage"}
                          title={doc.title}
                          author={doc.author}
                        />
                        <span className="format-badge">
                          {doc.format === "EPUB" ? (
                            <BookOpen size={11} />
                          ) : (
                            <FileText size={11} />
                          )}{" "}
                          {doc.format}
                        </span>
                        {doc.sample && (
                          <span className="sample-badge">SAMPLE</span>
                        )}
                      </div>
                      <div className="book-card-body">
                        <h3>{doc.title}</h3>
                        <p>{doc.author}</p>
                        <div className="book-card-bottom">
                          <span>
                            <Highlighter size={13} />
                            {formatCount(
                              library.annotations.filter(
                                (a) => a.documentId === doc.id,
                              ).length,
                              "annotation",
                            )}
                          </span>
                          <ArrowUpRight size={16} />
                        </div>
                      </div>
                    </button>
                    <button
                      className="book-organize icon-button"
                      title="Organize book into folders"
                      aria-label={`Organize ${doc.title} into folders`}
                      onClick={() =>
                        setOrganizing({ kind: "doc", record: doc })
                      }
                    >
                      <FolderHeart size={18} />
                    </button>
                  </div>
                ))}
                {!query && format === "All reading" && (
                  <button className="add-book-card" onClick={openImport}>
                    <span className="add-book-icon">
                      <Plus size={25} strokeWidth={1.2} />
                    </span>
                    <h3>Add a reading</h3>
                    <p>
                      Import a PDF, book, or document.
                      <br />
                      Or save a link to read online.
                    </p>
                    <span className="add-book-link">
                      Add to your library <ArrowUpRight size={14} />
                    </span>
                    <div className="supported-types">
                      PDF · EPUB · WEB · TEXT
                    </div>
                  </button>
                )}
              </div>
              {!documents.length && (
                <Empty
                  icon={BookOpen}
                  title={query ? "No readings found" : "No readings yet"}
                  text={
                    query
                      ? "Try a title, a highlighted phrase, or a label."
                      : "Import a file or save a website to get started."
                  }
                />
              )}{" "}
              {!query && (
                <section className="recent-section">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">RECENT ACTIVITY</span>
                      <h2>Recent annotations</h2>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => navigate("annotations")}
                    >
                      View all annotations <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="annotation-grid">
                    {[...library.annotations]
                      .sort((a, b) =>
                        (b.updatedAt || b.createdAt || "").localeCompare(
                          a.updatedAt || a.createdAt || "",
                        ),
                      )
                      .slice(0, 3)
                      .map((a) => (
                        <AnnotationCard
                          key={a.id}
                          annotation={a}
                          onOpen={openAnnotation}
                          onEdit={setEditing}
                          onDelete={setDeleteTarget}
                          onOrganize={organizeAnnotation}
                        />
                      ))}
                  </div>
                  {!library.annotations.length && (
                    <p className="muted">
                      Your recent highlights and notes will appear here.
                    </p>
                  )}
                </section>
              )}
            </>
          ) : view === "labels" ? (
            <div className="label-grid">
              {labels
                .filter((l) => l.toLowerCase().includes(query.toLowerCase()))
                .map((label, i) => (
                  <button
                    key={label}
                    className="label-collection"
                    style={{ "--label-color": COLORS[i % COLORS.length].value }}
                    onClick={() => navigate("annotations", label)}
                  >
                    <Tag size={22} strokeWidth={1.3} />
                    <h3>{label}</h3>
                    <span>
                      {formatCount(
                        library.annotations.filter((a) =>
                          a.labels.includes(label),
                        ).length,
                        "annotation",
                      )}{" "}
                      <ArrowUpRight size={15} />
                    </span>
                  </button>
                ))}
              {!labels.length && (
                <Empty
                  icon={Tag}
                  title="No labels yet"
                  text="Create labels while saving or editing an annotation."
                />
              )}
            </div>
          ) : (
            <>
              <div className="annotation-grid all-annotations">
                {annotations.map((a) => (
                  <AnnotationCard
                    key={a.id}
                    annotation={a}
                    onOpen={openAnnotation}
                    onEdit={setEditing}
                    onDelete={setDeleteTarget}
                    onOrganize={organizeAnnotation}
                  />
                ))}
              </div>
              {!annotations.length && (
                <Empty
                  icon={view === "bookmarks" ? Bookmark : Search}
                  title={
                    query
                      ? "No matching annotations"
                      : view === "bookmarks"
                        ? "No bookmarks yet"
                        : "No annotations yet"
                  }
                  text={
                    query
                      ? "Try a different phrase or change your filter."
                      : "Open a reading to highlight text, add a note, or bookmark a page."
                  }
                />
              )}
            </>
          )}
          {folderDialogs}
          <footer className="page-footer">
            <span>
              <Leaf size={13} /> Marginalia · Study notes & highlights
            </span>
            <span>Export backups in Settings.</span>
          </footer>
        </main>
      </div>
      {modal === "import" && (
        <Modal
          title="Add reading"
          subtitle="Import a file or save a website link."
          onClose={() => !busy && setModal(null)}
        >
          <div className="modal-tabs">
            <button
              className={importTab === "file" ? "active" : ""}
              onClick={() => setImportTab("file")}
            >
              Import a file
            </button>
            <button
              className={importTab === "url" ? "active" : ""}
              onClick={() => setImportTab("url")}
            >
              Save a website
            </button>
          </div>
          {importTab === "file" ? (
            <>
              <button
                className="drop-zone"
                disabled={busy}
                onClick={() => fileInput.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy) handleFiles([...e.dataTransfer.files]);
                }}
              >
                {busy ? (
                  <Loader2 className="spin" size={30} />
                ) : (
                  <Upload size={28} strokeWidth={1.3} />
                )}
                <h3>{busy ? "Importing file…" : "Drop a file here"}</h3>
                <p>or click to browse your files</p>
                <span>PDF, EPUB, HTML, Markdown & text · up to 75 MB each</span>
              </button>
              <p className="form-hint">
                Files stay on your device. EPUBs must be DRM-free; scanned PDFs
                need a text layer for highlighting.
              </p>
            </>
          ) : (
            <form onSubmit={saveUrl}>
              <label className="field-label" htmlFor="website-url">
                Website address
              </label>
              <input
                id="website-url"
                className="text-input"
                type="url"
                placeholder="https://www.gutenberg.org/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="form-hint">
                Save an article or website to your library. Use the Marginalia
                extension on that page to highlight and add notes.
              </p>
              <button className="button primary full" type="submit">
                <Plus size={16} />
                Save to library
              </button>
            </form>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {modal === "settings" && (
        <Modal
          title="Settings & backup"
          subtitle="Manage your locally saved readings and annotations."
          onClose={() => !busy && setModal(null)}
        >
          <div className="settings-section">
            <h3>Your library</h3>
            <p>
              {formatCount(library.documents.length, "reading")} ·{" "}
              {formatCount(library.annotations.length, "annotation")} ·{" "}
              {formatCount(labels.length, "label")} ·{" "}
              {formatCount(library.folders.length, "folder")}
            </p>
            <div className="settings-buttons">
              <button
                className="button secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await exportLibrary(library);
                    notify("Your backup is ready.");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <ArrowDownToLine size={16} />
                Export backup
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => restoreInput.current.click()}
              >
                <Upload size={16} />
                Import backup
              </button>
            </div>
            <p className="form-hint">
              Backups include notes, labels, folders, imported reading content,
              and PDF files. Import merges with your library and keeps newer
              local edits.
            </p>
          </div>
          <div className="settings-section">
            <h3>Reading on the web</h3>
            <ol className="install-steps">
              <li>Pin Marginalia from your browser’s Extensions menu.</li>
              <li>
                Open a website, click Marginalia, and choose “Annotate this
                page”.
              </li>
              <li>
                Select a passage, add your note and labels, and save. Your
                highlights return when you revisit the page.
              </li>
            </ol>
            <p className="form-hint">
              Import PDFs and DRM-free EPUBs into the library to annotate them.
              Browser internal pages and built-in PDF viewers cannot be
              annotated directly.
            </p>
            <div className="settings-buttons">
              <a
                className="text-link"
                href="help.html"
                target="_blank"
                rel="noreferrer"
              >
                Help & support <ArrowUpRight size={14} />
              </a>
              <a
                className="text-link"
                href="privacy.html"
                target="_blank"
                rel="noreferrer"
              >
                Privacy policy <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
          <div className="settings-section">
            <h3>Data & privacy</h3>
            <p className="form-hint">
              Saved passages, surrounding text, notes, labels, folders, document
              content, and source URLs stay in this browser profile. Nothing is
              sent to us. Exported backups are unencrypted files; keep them
              somewhere private.
            </p>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setError("");
                setModal("clear");
              }}
            >
              Delete all local reading data
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {modal === "clear" && (
        <Modal
          title="Clear your entire library?"
          subtitle="This deletes all readings, notes, labels, folders, bookmarks, and imported PDF files from this browser profile. It cannot be undone. Export a backup first if you want to keep them."
          onClose={() => !busy && setModal("settings")}
        >
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setModal("settings")}
            >
              Keep my library
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await clearLibrary();
                  await refresh();
                  setModal(null);
                  navigate("library");
                  notify(
                    "Local reading data deleted. Your exported backups are unchanged.",
                  );
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete everything"}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      <input
        ref={fileInput}
        hidden
        type="file"
        multiple
        accept=".pdf,.epub,.html,.htm,.txt,.md"
        onChange={(e) => handleFiles([...e.target.files])}
      />
      <input
        ref={restoreInput}
        hidden
        type="file"
        accept=".json"
        onChange={(e) => restore(e.target.files[0])}
      />
      {editing && (
        <AnnotationEditor
          annotation={editing}
          labels={labels}
          onClose={() => setEditing(null)}
          onSave={saveAnnotation}
        />
      )}
      <DeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={remove}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {error && !modal && (
        <div className="error-banner" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function FlowerMark() {
  return <Leaf size={19} strokeWidth={1.4} />;
}
function Empty({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={30} strokeWidth={1.2} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function DeleteDialog({ target, onClose, onDelete }) {
  return (
    target && (
      <Modal
        title="Delete annotation?"
        subtitle="This deletes the annotation and its note. The source document stays in your library."
        onClose={onClose}
      >
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button danger" onClick={onDelete}>
            Delete annotation
          </button>
        </div>
      </Modal>
    )
  );
}
export function AnnotationEditor({ annotation, labels, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...annotation }),
    [labelText, setLabelText] = useState(annotation.labels.join(", ")),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Annotation details"
      subtitle="Add a note or labels, then save your annotation."
      onClose={() => !saving && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSave({
              ...draft,
              labels: [
                ...new Set(
                  labelText
                    .split(",")
                    .map((l) => l.trim().slice(0, 100))
                    .filter(Boolean),
                ),
              ].slice(0, 100),
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {
            setError(e.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="editor-type-row">
          <select
            aria-label="Annotation tool"
            className="filter-select"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          >
            {TYPES.map((t) => (
              <option value={t} key={t}>
                {TYPE_NAMES[t]}
              </option>
            ))}
          </select>
          <ColorPicker
            value={draft.color}
            onChange={(color) => setDraft({ ...draft, color })}
          />
        </div>
        {draft.quote && (
          <blockquote
            className="editor-quote"
            style={{ borderColor: draft.color }}
          >
            {draft.quote}
          </blockquote>
        )}
        <label className="field-label" htmlFor="annotation-note">
          Your note
        </label>
        <textarea
          id="annotation-note"
          className="text-input"
          rows={4}
          placeholder="Add an explanation, question, or reminder…"
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          maxLength={100000}
        />
        <label className="field-label" htmlFor="annotation-labels">
          Labels <span>separate with commas</span>
        </label>
        <input
          id="annotation-labels"
          className="text-input"
          placeholder="Key terms, Essay evidence, Review…"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
        />
        {labels.length > 0 && (
          <div className="label-suggestions">
            {labels
              .filter(
                (l) =>
                  !labelText
                    .split(",")
                    .map((x) => x.trim())
                    .includes(l),
              )
              .slice(0, 5)
              .map((l) => (
                <button
                  type="button"
                  className="tag"
                  key={l}
                  onClick={() =>
                    setLabelText(labelText ? `${labelText}, ${l}` : l)
                  }
                >
                  + {l}
                </button>
              ))}
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={saving} type="submit">
            <Check size={16} />
            {saving ? "Saving…" : "Save annotation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
