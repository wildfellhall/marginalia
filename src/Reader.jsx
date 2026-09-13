import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  FolderHeart,
  List,
  Loader2,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  X,
} from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  AnnotationCard,
  ColorPicker,
  Logo,
  TYPE_ICONS,
} from "./components.jsx";
import { AnnotationEditor } from "./App.jsx";
import { anchorRange, captureAnchor, paintAnnotations } from "./anchors.mjs";
import { cleanHTML } from "./importers.mjs";
import { COLORS, TYPES, TYPE_NAMES, searchAnnotations, uid } from "./model.mjs";
import { fileStore } from "./storage.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function Reader({
  document: doc,
  annotations,
  onBack,
  onSave,
  onEdit,
  onDelete,
  onOrganize,
  initialJump,
}) {
  const root = useRef(),
    scrollRef = useRef();
  const [color, setColor] = useState(COLORS[0].value),
    [type, setType] = useState("highlight"),
    [selection, setSelection] = useState(null),
    [draft, setDraft] = useState(null),
    [sidebar, setSidebar] = useState(() => window.innerWidth > 680),
    [page, setPage] = useState(initialJump?.page || 1),
    [pages, setPages] = useState(1),
    [rendered, setRendered] = useState(0),
    [fontSize, setFontSize] = useState(18),
    [query, setQuery] = useState(""),
    [jump, setJump] = useState(initialJump),
    [toc, setToc] = useState(false),
    [markers, setMarkers] = useState([]);
  const isPDF = doc.format === "PDF",
    shown = searchAnnotations(annotations, query);
  useEffect(() => {
    if (!root.current) return;
    return paintAnnotations(
      root.current,
      annotations.filter((a) => !isPDF || a.page === page),
      "reader",
    );
  }, [annotations, page, rendered, isPDF]);
  useEffect(() => {
    if (!root.current) return;
    const update = () => {
      const box = root.current.getBoundingClientRect(),
        taken = [];
      setMarkers(
        annotations
          .filter(
            (a) =>
              ["margin", "sticky", "flag", "tab", "bookmark"].includes(
                a.type,
              ) &&
              (!isPDF || a.page === page),
          )
          .map((a) => {
            const range = a.anchor && anchorRange(root.current, a.anchor);
            let top = range
              ? range.getBoundingClientRect().top - box.top
              : Math.max(
                  0,
                  (a.scrollY || 0) - (root.current.offsetTop || 0) + 150,
                );
            while (taken.some((t) => Math.abs(t - top) < 25)) top += 27;
            taken.push(top);
            return { annotation: a, top };
          }),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [annotations, page, rendered, fontSize, isPDF, sidebar]);
  useEffect(() => {
    if (!jump || !root.current) return;
    if (isPDF && page !== jump.page) {
      setPage(jump.page);
      return;
    }
    const range = jump.anchor && anchorRange(root.current, jump.anchor);
    if (range) {
      range.startContainer.parentElement.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      setJump(null);
    } else if (!jump.anchor) {
      scrollRef.current.scrollTop = jump.scrollY || 0;
      setJump(null);
    }
  }, [jump, rendered, page, isPDF]);
  const pickSelection = () => {
    const sel = window.getSelection();
    if (
      !sel?.rangeCount ||
      sel.isCollapsed ||
      !root.current?.contains(sel.anchorNode) ||
      !root.current?.contains(sel.focusNode)
    )
      return;
    const anchor = captureAnchor(root.current, sel.getRangeAt(0));
    if (anchor && anchor.exact.trim()) setSelection(anchor);
  };
  const annotate = (chosenType = type) => {
    setDraft({
      id: uid(),
      documentId: doc.id,
      documentTitle: doc.title,
      type: chosenType,
      color,
      quote: selection?.exact || "",
      anchor: selection || null,
      note: "",
      labels: [],
      page,
      scrollY: scrollRef.current.scrollTop,
      createdAt: new Date().toISOString(),
    });
  };
  const headings = () => [
    ...(root.current?.querySelectorAll("h1,h2,h3") || []),
  ];
  return (
    <div className="reader-shell">
      <header className="reader-header">
        <button className="button text-button" onClick={onBack}>
          <ArrowLeft size={17} />
          My library
        </button>
        <Logo small />
        <div className="reader-header-right">
          <span className="storage-status">
            <span />
            Saved on this device
          </span>
          <button
            className="icon-button"
            title={sidebar ? "Hide annotations" : "Show annotations"}
            aria-label={sidebar ? "Hide annotations" : "Show annotations"}
            onClick={() => setSidebar(!sidebar)}
          >
            {sidebar ? (
              <PanelRightClose size={19} />
            ) : (
              <PanelRightOpen size={19} />
            )}
          </button>
        </div>
      </header>
      <div className="reading-toolbar">
        <div className="tool-group">
          {TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                className={`tool-button ${type === t ? "active" : ""}`}
                aria-label={TYPE_NAMES[t]}
                title={TYPE_NAMES[t]}
                aria-pressed={type === t}
                onClick={() => {
                  setType(t);
                  if (
                    selection ||
                    ["bookmark", "flag", "tab", "sticky"].includes(t)
                  )
                    annotate(t);
                }}
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{TYPE_NAMES[t]}</span>
              </button>
            );
          })}
        </div>
        <span className="toolbar-divider" />
        <ColorPicker value={color} onChange={setColor} />
        {!isPDF && (
          <div className="reader-font-controls">
            <button
              className="icon-button"
              aria-label="Decrease text size"
              onClick={() => setFontSize(Math.max(14, fontSize - 1))}
            >
              <Minus size={14} />
            </button>
            <span>Aa</span>
            <button
              className="icon-button"
              aria-label="Increase text size"
              onClick={() => setFontSize(Math.min(26, fontSize + 1))}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="reader-body">
        <div className="reading-scroll" ref={scrollRef}>
          <div className="reader-document-heading">
            <div className="eyebrow">
              {doc.format} {doc.sample ? "· SAMPLE EXCERPT" : ""}
            </div>
            <h1>{doc.title}</h1>
            <p>{doc.author}</p>
            <div className="reader-document-actions">
              <button
                className="text-link"
                onClick={() => onOrganize({ kind: "doc", record: doc })}
              >
                <FolderHeart size={15} />
                Organize into folders
              </button>
              {!isPDF && (
                <button className="text-link" onClick={() => setToc(!toc)}>
                  <List size={15} />
                  Contents
                </button>
              )}
              {doc.url && (
                <a
                  className="text-link"
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View source <ArrowUpRight size={14} />
                </a>
              )}
              <button
                className="text-link"
                onClick={() => annotate("bookmark")}
              >
                <Bookmark size={15} />
                Save my place
              </button>
            </div>
            {toc && (
              <div className="contents-list">
                {headings().map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      h.scrollIntoView({ behavior: "smooth", block: "start" });
                      setToc(false);
                    }}
                  >
                    {h.textContent}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            className="reading-surface"
            ref={root}
            onMouseUp={pickSelection}
            onKeyUp={pickSelection}
            style={{ "--reading-size": `${fontSize}px` }}
          >
            {isPDF ? (
              <PdfPage
                documentId={doc.id}
                page={page}
                onPages={setPages}
                onRendered={() => setRendered((v) => v + 1)}
              />
            ) : (
              <article
                className="prose"
                dangerouslySetInnerHTML={{ __html: cleanHTML(doc.html || "") }}
              />
            )}
            <div className="reader-markers" data-marginalia-ui="">
              {markers.map(({ annotation: a, top }) => {
                const Icon = TYPE_ICONS[a.type];
                return (
                  <button
                    key={a.id}
                    className={`reader-marker ${a.type}`}
                    style={{ top, background: a.color }}
                    title={`${TYPE_NAMES[a.type]}: ${a.note || a.quote || "Saved position"}`}
                    aria-label={`Open ${TYPE_NAMES[a.type].toLowerCase()}: ${a.note || a.quote || "saved position"}`}
                    onClick={() => onEdit(a)}
                  >
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="reader-end">
            <span>✧</span>
            <p>
              {doc.sample
                ? "End of sample. Import the full text to continue reading."
                : isPDF
                  ? "End of page."
                  : "End of reading."}
            </p>
            {doc.sample && doc.url && (
              <a
                className="text-link"
                target="_blank"
                rel="noreferrer"
                href={doc.url}
              >
                Find the complete book <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>
        {sidebar && (
          <aside className="reader-notes">
            <div className="reader-notes-heading">
              <h2>
                Annotations <span>{annotations.length}</span>
              </h2>
              <p>Highlights and notes for this reading.</p>
            </div>
            <div className="search-field">
              <Search size={15} />
              <input
                aria-label="Search this reading's annotations"
                placeholder="Search notes, passages, or labels…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              className="add-margin-note"
              onClick={() => annotate("margin")}
            >
              <Plus size={15} />
              Add a margin note
            </button>
            <div className="reader-note-list">
              {shown.map((a) => (
                <AnnotationCard
                  key={a.id}
                  annotation={a}
                  compact
                  onOpen={(a) => {
                    setJump(a);
                    if (isPDF) setPage(a.page || 1);
                  }}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOrganize={(record) => onOrganize({ kind: "ann", record })}
                />
              ))}
              {!shown.length && (
                <div className="empty-state">
                  <Highlighter size={27} />
                  <h3>{query ? "No matching notes" : "No annotations yet"}</h3>
                  <p>
                    Select a passage to highlight it, or add a note to this
                    page.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      {isPDF && (
        <div className="page-navigation">
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => {
              setPage(page - 1);
              setSelection(null);
              scrollRef.current.scrollTop = 0;
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={page >= pages}
            onClick={() => {
              setPage(page + 1);
              setSelection(null);
              scrollRef.current.scrollTop = 0;
            }}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      )}
      {selection && !draft && (
        <div className="selection-bar" role="status">
          <Highlighter size={16} />
          <span>
            {selection.exact.length > 58
              ? selection.exact.slice(0, 58) + "…"
              : selection.exact}
          </span>
          <button className="button primary" onClick={() => annotate()}>
            <Plus size={15} />
            Annotate selection
          </button>
          <button
            className="icon-button"
            aria-label="Dismiss selection"
            onClick={() => setSelection(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {draft && (
        <AnnotationEditor
          annotation={draft}
          labels={[...new Set(annotations.flatMap((a) => a.labels))]}
          onClose={() => setDraft(null)}
          onSave={async (a) => {
            await onSave(a);
            setDraft(null);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </div>
  );
}
function PdfPage({ documentId, page, onPages, onRendered }) {
  const container = useRef(),
    pdf = useRef(),
    onRenderedRef = useRef(onRendered),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [noText, setNoText] = useState(false),
    [width, setWidth] = useState(0);
  onRenderedRef.current = onRendered;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let stopped = false,
      task;
    setLoaded(false);
    setError("");
    fileStore("get", documentId)
      .then(async (blob) => {
        if (!blob)
          throw new Error(
            "The PDF file is missing. Import the original file or restore a backup containing it.",
          );
        const buffer = await blob.arrayBuffer();
        if (stopped) return;
        const assets = new URL("pdfjs/", window.document.baseURI).href;
        task = pdfjs.getDocument({
          data: buffer,
          isEvalSupported: false,
          cMapUrl: `${assets}cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${assets}standard_fonts/`,
          wasmUrl: `${assets}wasm/`,
          iccUrl: `${assets}iccs/`,
        });
        const doc = await task.promise;
        if (stopped) {
          doc.destroy();
          return;
        }
        pdf.current = doc;
        onPages(doc.numPages);
        setLoaded(true);
      })
      .catch((e) => {
        if (!stopped) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      stopped = true;
      pdf.current = null;
      task?.destroy();
    };
  }, [documentId, onPages]);
  useEffect(() => {
    if (!loaded || !pdf.current) return;
    let stopped = false,
      renderTask,
      textLayer;
    setLoading(true);
    setError("");
    setNoText(false);
    const host = container.current;
    host.replaceChildren();
    (async () => {
      const pdfPage = await pdf.current.getPage(page);
      if (stopped) return;
      const original = pdfPage.getViewport({ scale: 1 });
      const scale =
        Math.min(760, Math.max(300, host.clientWidth || 700)) / original.width;
      const viewport = pdfPage.getViewport({ scale });
      const wrapper = document.createElement("div");
      wrapper.className = "pdf-page";
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;
      wrapper.style.setProperty("--scale-factor", scale);
      wrapper.style.setProperty("--total-scale-factor", scale);
      const canvas = document.createElement("canvas");
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      wrapper.append(canvas);
      const layer = document.createElement("div");
      layer.className = "textLayer";
      wrapper.append(layer);
      host.replaceChildren(wrapper);
      renderTask = pdfPage.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
        transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
      });
      const text = await pdfPage.getTextContent();
      if (stopped) return;
      setNoText(!text.items.some((i) => i.str?.trim()));
      textLayer = new pdfjs.TextLayer({
        textContentSource: text,
        container: layer,
        viewport,
      });
      await Promise.all([renderTask.promise, textLayer.render()]);
      if (!stopped) {
        setLoading(false);
        onRenderedRef.current();
      }
    })().catch((e) => {
      if (!stopped && e.name !== "RenderingCancelledException") {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      stopped = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [loaded, page, width]);
  return (
    <>
      {loading && (
        <div className="pdf-message">
          <Loader2 size={20} className="spin" />
          Opening your page…
        </div>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {noText && (
        <div className="pdf-message">
          This page has no selectable text. You can still add page notes, flags,
          tabs, and bookmarks.
        </div>
      )}
      <div className="pdf-container" ref={container} />
    </>
  );
}
