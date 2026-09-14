# Marginalia

**Study Notes & Highlights** — a Chrome and Edge extension for annotating websites, PDFs, and EPUBs. Organize readings and notes by course or assignment, then search them when writing or reviewing.

Available Now: https://chromewebstore.google.com/detail/khajohmbdncfelepgmkaiikpmefjogfm?utm_source=item-share-cb


Demonstration Video: https://www.youtube.com/watch?v=rI3JVI6jBSM&t=98s

## Features

- Highlights in six pastel colors or any custom color.
- Underlines, margin notes, sticky notes, flags, tabs, and bookmarks.
- Search by highlighted text, notes, labels, and document titles.
- Folders for readings and individual annotations, with multiple-folder membership.
- Local persistence and backup export/import, including original PDF files.

## Run locally

Requires Node.js 20.19+ on the 20.x line, or 22.12+.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. A new library includes three labeled sample readings and annotations.

## Build and install the extension

```sh
npm run build
```

1. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select the generated `dist/` directory.
3. Pin Marginalia. On a website, choose **Annotate this page** from its popup.
4. Refresh tabs that were open before installation.

Chrome or Chromium-based Edge 140+ is required. The build includes `dist/manifest.json`, bundled scripts, fonts, PDF resources, icons, and third-party license notices. Use `dist/`, not the source `extension/` directory, when loading or packing.

The browser extension and local development preview have separate libraries. Export/import transfers data between them.

## Using the app

Choose **Add reading** to import a PDF, DRM-free EPUB, HTML, text, or Markdown file, or save a website link. Select text to highlight or underline it. Add notes and comma-separated labels, then save.

Use **My folders → New folder** to organize by course, assignment, or topic. The folder icon on a reading or annotation lets you choose its folders. Adding a reading includes its existing and future annotations. Removing a folder never deletes the original readings or notes.

Use **Settings & backup** to export, import, or clear your library. Backups include readings, annotations, folders, labels, and available PDF files.

## Supported content and limits

PDFs must be imported into Marginalia rather than annotated in the browser's built-in PDF viewer. Scanned PDFs without selectable text support page notes and bookmarks, but not text highlighting; OCR is not included. EPUBs must be DRM-free. Markdown is displayed as plain text.

Files are limited to 75 MB per import; extracted EPUB content is limited to 20 MB. Protected browser pages, extension stores, closed shadow roots, and embedded cross-origin frames cannot be annotated. Source changes may prevent a highlight from being relocated, but the saved quote remains searchable.

## Privacy

The app handles and stores user data locally using extension storage and IndexedDB. It has no account, analytics, developer upload server, or automatic cloud sync. All runtime code and fonts are bundled.

**On-page notes are readable by the host website's scripts**, including notes in the hidden annotation panel. Do not enter confidential information there. Marginalia does not encrypt local records or exported backups. These are current limitations, not guarantees of privacy from websites or other users of your device.

See the [privacy policy](public/privacy.html) and [help page](public/help.html) for details.

## Demonstration screenshots

[Library](screenshots/01-reading-library.png) · [Reader](screenshots/02-book-reader.png) · [Notes and colors](screenshots/03-notes-and-colors.png) · [Search and labels](screenshots/04-search-and-labels.png) · [Website annotations](screenshots/05-website-annotation.png)

The five screenshots use sample content, not a personal library.

## Source layout

- `src/`: React library and reader, annotation tools, folders, importers, and local storage.
- `extension/`: Manifest V3 source, website content script, popup, and background worker.
- `public/`: runtime icons, help and privacy pages, and their styles.
- `scripts/`: required extension build, PDF resource preparation, and third-party notice generation.
- `screenshots/`: demonstration images.
- `package.json`, `package-lock.json`, `vite.config.js`, and `index.html`: dependencies and build entry points.

Sample book excerpts are from _Pride and Prejudice_ and _The Secret Garden_. “Taking useful reading notes” is an original introductory sample. Book samples are excerpts, not complete books. Public-domain availability can vary by jurisdiction.
