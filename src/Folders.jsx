import React, { useState } from "react";
import {
  FolderHeart,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  BookOpen,
  X,
} from "lucide-react";
import { AnnotationCard, Modal, ColorPicker } from "./components.jsx";
import { createFolder, folderContents } from "./folders.mjs";
import { COLORS, searchAnnotations, formatCount } from "./model.mjs";

export function FolderEditor({ folder, onClose, onSave }) {
  const [name, setName] = useState(folder?.name || "");
  const [color, setColor] = useState(folder?.color || COLORS[3].value);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={folder ? "Edit folder" : "New folder"}
      subtitle="Organize readings and annotations by course, assignment, or topic."
      onClose={busy ? () => {} : onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const fresh = createFolder(name, color);
            await onSave(
              folder
                ? {
                    ...folder,
                    name: fresh.name,
                    color,
                    updatedAt: fresh.updatedAt,
                  }
                : fresh,
            );
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field-label" htmlFor="folder-name">
          Folder name
        </label>
        <input
          id="folder-name"
          className="folder-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="e.g. Biology 101"
          required
          autoFocus
        />
        <p className="field-label">Folder color</p>
        <ColorPicker value={color} onChange={setColor} />
        {error && <p role="alert">{error}</p>}
        <div className="modal-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : folder ? "Save folder" : "Create folder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function FolderPicker({ folders, target, onClose, onSave }) {
  const field = target.kind === "doc" ? "documentIds" : "annotationIds";
  const [initialFolders] = useState(folders);
  const [drafts, setDrafts] = useState(folders);
  const [selected, setSelected] = useState(() =>
    folders.filter((f) => f[field].includes(target.record.id)).map((f) => f.id),
  );
  const [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Organize into folders"
      subtitle={
        target.kind === "doc"
          ? target.record.title
          : (
              target.record.quote ||
              target.record.note ||
              "Saved annotation"
            ).slice(0, 250)
      }
      onClose={busy ? () => {} : onClose}
    >
      <p className="muted">
        Choose one or more folders. Your original stays in the library.
      </p>
      <div className="folder-choices">
        {drafts.map((folder) => {
          const inherited =
            target.kind === "ann" &&
            folder.documentIds.includes(target.record.documentId);
          return (
            <label className="folder-choice" key={folder.id}>
              <input
                type="checkbox"
                checked={selected.includes(folder.id)}
                onChange={(event) =>
                  setSelected((ids) =>
                    event.target.checked
                      ? [...ids, folder.id]
                      : ids.filter((id) => id !== folder.id),
                  )
                }
              />
              <FolderHeart size={21} style={{ fill: folder.color }} />
              <span>
                {folder.name}
                {inherited && (
                  <small>
                    Already included with its book. Check to keep this note here
                    independently.
                  </small>
                )}
              </span>
            </label>
          );
        })}
        {!drafts.length && (
          <p className="muted">No folders yet. Create one below.</p>
        )}
      </div>
      <form
        className="inline-folder-form"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const folder = createFolder(name);
            setDrafts([...drafts, folder]);
            setSelected([...selected, folder.id]);
            setName("");
            setError("");
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <input
          className="folder-name-input"
          aria-label="New folder name"
          placeholder="Create a new folder…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
        <button className="button" disabled={busy || !name.trim()}>
          <Plus size={16} />
          Create
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <div className="modal-actions">
        <button className="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onSave(drafts, selected, initialFolders);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save organization"}
        </button>
      </div>
    </Modal>
  );
}

export function FoldersView({
  library,
  activeFolder,
  query,
  onOpenFolder,
  onCreate,
  onEditFolder,
  onDeleteFolder,
  onOpenDocument,
  onOpenAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onOrganize,
  onRemove,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!activeFolder) {
    const shown = library.folders
      .filter((f) =>
        f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="folder-grid">
        {shown.map((folder) => {
          const contents = folderContents(folder, library);
          return (
            <button
              className="folder-card"
              key={folder.id}
              style={{ "--folder-color": folder.color }}
              onClick={() => onOpenFolder(folder.id)}
            >
              <FolderHeart size={36} strokeWidth={1.2} />
              <h3>{folder.name}</h3>
              <p>
                {formatCount(contents.documents.length, "reading")} ·{" "}
                {formatCount(contents.annotations.length, "annotation")}
              </p>
            </button>
          );
        })}
        {!query && (
          <button className="folder-card new-folder-card" onClick={onCreate}>
            <Plus size={30} strokeWidth={1.2} />
            <h3>New folder</h3>
            <p>Group readings and notes by course.</p>
          </button>
        )}
        {query && !shown.length && (
          <p className="muted">No folders match that name.</p>
        )}
      </div>
    );
  }
  const contents = folderContents(activeFolder, library);
  const annotations = searchAnnotations(contents.annotations, query);
  const matchingDocs = new Set(annotations.map((a) => a.documentId));
  const documents = contents.documents.filter(
    (d) =>
      !query ||
      `${d.title} ${d.author || ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) ||
      matchingDocs.has(d.id),
  );
  return (
    <section className="folder-detail">
      <div className="folder-detail-actions">
        <button className="text-link" onClick={() => onOpenFolder(null)}>
          <ArrowLeft size={16} />
          All folders
        </button>
        <button className="button" onClick={() => onEditFolder(activeFolder)}>
          <Pencil size={15} />
          Edit folder
        </button>
        <button className="button" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={15} />
          Delete folder
        </button>
      </div>
      <p className="muted">
        Use the folder icon on any book or annotation to add it here. Books
        bring all their annotations, including future notes.
      </p>
      {error && <p role="alert">{error}</p>}
      <h2>
        Readings <span className="section-count">{documents.length}</span>
      </h2>
      <div className="folder-reads">
        {documents.map((doc) => (
          <article className="folder-read" key={doc.id}>
            <button
              className="folder-read-open"
              onClick={() => onOpenDocument(doc)}
            >
              <BookOpen size={24} />
              <span>
                <strong>{doc.title}</strong>
                <small>
                  {doc.format} · {doc.author}
                </small>
              </span>
            </button>
            <button
              className="icon-button"
              title="Organize book into folders"
              aria-label={`Organize ${doc.title} into folders`}
              onClick={() => onOrganize({ kind: "doc", record: doc })}
            >
              <FolderHeart size={17} />
            </button>
            <button
              className="icon-button"
              disabled={busy}
              aria-label={`Remove ${doc.title} from folder`}
              onClick={async () => {
                setBusy(true);
                try {
                  await onRemove(activeFolder, "doc", doc.id);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <X size={17} />
            </button>
          </article>
        ))}
      </div>
      {!documents.length && (
        <p className="muted">
          {query
            ? "No matching readings."
            : "No readings added yet. You can also add individual annotations."}
        </p>
      )}
      <h2>
        Annotations <span className="section-count">{annotations.length}</span>
      </h2>
      <div className="annotation-grid all-annotations">
        {annotations.map((a) => (
          <div className="folder-annotation" key={a.id}>
            <AnnotationCard
              annotation={a}
              onOpen={onOpenAnnotation}
              onEdit={onEditAnnotation}
              onDelete={onDeleteAnnotation}
              onOrganize={(record) => onOrganize({ kind: "ann", record })}
            />
            <span className="folder-membership-hint">
              {activeFolder.documentIds.includes(a.documentId)
                ? "Included with its book"
                : "Saved individually"}
            </span>
          </div>
        ))}
      </div>
      {!annotations.length && (
        <p className="muted">
          {query
            ? "No matching annotations. Try a passage, note, or label."
            : "Add a reading or an annotation to see notes here."}
        </p>
      )}
      {confirmDelete && (
        <Modal
          title={`Delete “${activeFolder.name}”?`}
          subtitle="Only the folder will be removed. All books and annotations will stay in your library."
          onClose={busy ? () => {} : () => setConfirmDelete(false)}
        >
          <div className="modal-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              Keep folder
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDeleteFolder(activeFolder);
                  setConfirmDelete(false);
                } catch (e) {
                  setError(e.message);
                  setConfirmDelete(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete folder
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
