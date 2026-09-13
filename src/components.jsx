import React, { useEffect, useRef } from "react";
import {
  X,
  Flower2,
  Highlighter,
  Underline,
  MessageSquare,
  StickyNote,
  Flag,
  PanelRight,
  Bookmark,
  Check,
  ArrowUpRight,
  Trash2,
  Pencil,
  FolderHeart,
} from "lucide-react";
import { COLORS, TYPE_NAMES } from "./model.mjs";
export const TYPE_ICONS = {
  highlight: Highlighter,
  underline: Underline,
  margin: MessageSquare,
  sticky: StickyNote,
  flag: Flag,
  tab: PanelRight,
  bookmark: Bookmark,
};
export function Logo({ small = false }) {
  return (
    <div className={`logo ${small ? "small" : ""}`}>
      <span className="logo-symbol">
        <Flower2 strokeWidth={1.25} />
      </span>
      <span>
        marginalia<span className="logo-dot">.</span>
      </span>
    </div>
  );
}
export function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const before = document.activeElement;
    ref.current.showModal();
    return () => before?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <button
        className="icon-button modal-close"
        onClick={onClose}
        aria-label="Close dialog"
      >
        <X size={20} />
      </button>
      <h2>{title}</h2>
      {subtitle && <p className="muted">{subtitle}</p>}
      {children}
    </dialog>
  );
}
export function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {COLORS.map((c) => (
        <button
          type="button"
          key={c.name}
          style={{ "--swatch": c.value }}
          className={`swatch ${value === c.value ? "selected" : ""}`}
          onClick={() => onChange(c.value)}
          title={c.name}
          aria-label={`${c.name} color`}
          aria-pressed={value === c.value}
        >
          {value === c.value && <Check size={13} />}
        </button>
      ))}
      <label className="custom-color" title="Choose any color">
        <input
          type="color"
          aria-label="Custom annotation color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>+</span>
      </label>
    </div>
  );
}
export function AnnotationCard({
  annotation: a,
  onOpen,
  onEdit,
  onDelete,
  onOrganize,
  compact = false,
}) {
  const Icon = TYPE_ICONS[a.type];
  return (
    <article
      className={`annotation-card ${a.type} ${compact ? "compact" : ""}`}
      style={{ "--annotation-color": a.color }}
    >
      <div className="annotation-meta">
        <span>
          <Icon size={14} />
          {TYPE_NAMES[a.type]}
        </span>
        <div className="card-actions">
          {onOrganize && (
            <button
              className="icon-button"
              title="Organize annotation into folders"
              aria-label="Organize annotation into folders"
              onClick={() => onOrganize(a)}
            >
              <FolderHeart size={14} />
            </button>
          )}
          <button
            className="icon-button"
            title="Edit annotation"
            aria-label="Edit annotation"
            onClick={() => onEdit(a)}
          >
            <Pencil size={14} />
          </button>
          <button
            className="icon-button"
            title="Delete annotation"
            aria-label="Delete annotation"
            onClick={() => onDelete(a)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {a.quote && (
        <button
          className={`quote ${a.type === "underline" ? "underlined" : ""}`}
          onClick={() => onOpen(a)}
        >
          “{a.quote}”
        </button>
      )}
      {a.note && <p className="annotation-note">{a.note}</p>}
      {!a.quote && !a.note && (
        <button className="quote" onClick={() => onOpen(a)}>
          {TYPE_NAMES[a.type]} · {a.page ? `Page ${a.page}` : "Saved position"}
        </button>
      )}
      <div className="label-row">
        {a.labels.map((label) => (
          <span className="tag" key={label}>
            {label}
          </span>
        ))}
      </div>
      <button className="annotation-source" onClick={() => onOpen(a)}>
        {a.documentTitle}
        <ArrowUpRight size={13} />
      </button>
    </article>
  );
}
export function BookArt({
  variant = "rose",
  title,
  author,
  miniature = false,
}) {
  return (
    <div className={`book-cover ${variant} ${miniature ? "miniature" : ""}`}>
      <div className="book-cover-border">
        <span className="book-edition">READING LIBRARY</span>
        <h3>{title}</h3>
        <div className="cover-botanical">
          <svg viewBox="0 0 160 100" fill="none" aria-hidden="true">
            <path d="M80 95C80 60 62 35 79 4M80 84C57 77 48 60 37 38M78 68C100 64 104 45 127 25M70 46C55 38 51 22 45 10" />
            <path d="M76 22C55 22 61 4 79 4C84 15 82 20 76 22ZM65 42C42 47 39 27 47 21C60 26 64 33 65 42ZM57 66C37 68 29 51 37 38C50 43 56 54 57 66ZM88 63C88 45 104 39 113 45C108 59 99 64 88 63ZM110 42C109 25 123 17 133 19C132 33 124 41 110 42ZM79 87C94 69 112 77 115 85C105 96 89 97 79 87Z" />
            <path d="M25 79h24M114 7h19M122 69h17" strokeDasharray="2 5" />
          </svg>
        </div>
        <span className="book-author">{author}</span>
        <span className="book-flourish">✧</span>
      </div>
    </div>
  );
}
export function ReadingIllustration() {
  return (
    <svg
      className="reading-illustration"
      viewBox="0 0 360 220"
      fill="none"
      aria-hidden="true"
    >
      <path d="M38 180c45-19 201-20 277 0" stroke="#c6bfce" />
      <g transform="rotate(-8 170 148)">
        <rect
          x="68"
          y="143"
          width="213"
          height="32"
          rx="3"
          fill="#d0d9c8"
          stroke="#8d9b85"
        />
        <path d="M85 150h195v17H85" fill="#faf7ef" stroke="#b0b8a6" />
        <path d="M99 155h169M102 160h164" stroke="#d5d3c9" />
      </g>
      <g transform="rotate(4 182 128)">
        <path
          d="M80 126h205v27H80q-16-12 0-27"
          fill="#e1bac0"
          stroke="#b68c98"
        />
        <path
          d="M87 131h198v16H87q-11-8 0-16"
          fill="#fbf7ee"
          stroke="#ccb2b5"
        />
        <path d="M99 136h173M101 141h168" stroke="#d6c9c6" />
        <path d="M242 132v33l9-6 8 6v-33" fill="#b7abc9" />
      </g>
      <path
        d="M78 111c30-22 62-16 101-4 37-24 74-23 105-9l-9 32c-39-12-68-8-95 9-38-16-67-14-104-4z"
        fill="#fcfaf2"
        stroke="#aca299"
      />
      <path
        d="M179 107l1 32M89 116c26-12 49-9 77 0M89 122c27-10 48-7 77 1M193 109c26-12 48-13 76-4M191 116c25-11 49-11 76-4M189 123c24-11 49-10 73-4"
        stroke="#d4cbc2"
      />
      <path
        d="M286 122c16-23 18-62 2-89M294 84c-20 0-24-17-18-27 15 4 19 13 18 27M296 67c15-6 19-19 10-26-10 6-14 15-10 26M289 46c-15-2-20-16-13-25 12 5 15 14 13 25"
        fill="#c6d4be"
        stroke="#8a9b7c"
      />
      <path d="M59 78l6-28 8 30M49 84l31-3" stroke="#b5a6c2" />
      <circle cx="100" cy="46" r="3" fill="#d4b18f" />
      <path d="M221 42v14M214 49h14M43 127v10M38 132h10" stroke="#b29dbd" />
      <path
        d="M235 78c-7-10 10-20 17-10 12-9 22 5 11 13l-19 13z"
        fill="#e6c6ca"
        stroke="#c3a2aa"
      />
    </svg>
  );
}
