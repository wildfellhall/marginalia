# Marginalia

A Chrome and Edge extension for annotating course readings, organizing notes by class or assignment, and finding passages for writing and review. Store title: **Marginalia — Study Notes & Highlights**. The interface uses pastel colors, serif typography, and thin borders.

## Chrome Web Store release

The store submission materials are in [store/SUBMISSION.md](store/SUBMISSION.md), with listing copy, privacy disclosures, and owner-supplied publisher fields. Run `npm run store:screenshots` after building to capture the five listing screenshots in a temporary browser profile, then `npm run release` to create the upload ZIP, checksums, static support site, artwork, and readiness report in `release/`. Chrome/Edge 140 or later is required.

The release ZIP is ready for dashboard upload after packaging checks pass. Actual submission still requires the owner's developer account, approved public contact information, and a publicly hosted HTTPS privacy-policy URL. The scripts do not publish a site, upload to the store, or make publisher certifications.

## Run the reading workspace

```sh
npm install
npm run dev
```

Open the local address printed by Vite. The first visit includes three clearly marked sample excerpts and annotations. All controls operate on real saved data.

## Install the extension in Chrome or Edge

```sh
npm run build
```

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project's `dist` directory.
4. Pin Marginalia in the browser toolbar.
5. Open a website, click Marginalia, and choose **Annotate this page**. Refresh existing tabs once after installation.

Use **Open my library** in the extension popup to access the collection shared with website annotations. The development preview and the installed extension have separate storage; export/import moves a collection between them.

## Reading and annotation

- Highlight in six pastel colors or choose any custom color.
- Underline passages; add margin notes, sticky notes, flags, tabs, and bookmarks.
- Select text, choose a tool, write an optional note, add comma-separated labels, and save.
- Add a sticky note, flag, tab, or bookmark without selecting text to remember a page position.
- Search highlighted text, notes, document titles, and labels. Filter by annotation type or label.
- Edit or delete annotations from the library or reader; edit directly in the website panel.
- Restore highlights automatically when returning to a website. Passage anchors use text offsets and surrounding context to recover after layout changes.
- Click a saved passage to return to it. Margin markers open the corresponding note for editing.

## Folders

Open **My folders → New folder** to create a collection with a name and color.
Use the folder icon on any book or annotation (including in the reader) to
choose one or more folders. Uncheck a membership to remove or move it.
Books bring all their annotations, including future notes. Individual notes
can also be saved independently of their book; this keeps them in the folder
even after the book is removed. Folder search covers titles, notes, quotes,
and labels. Rename or delete a folder from its detail view. Removing folder
memberships or deleting a folder leaves the original reading data intact.
Folders are included in backups, and older backups remain compatible.

## Supported formats

| Source                                     | How to read and annotate                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Articles, websites, Project Gutenberg HTML | Enable the extension on the original page. Save URLs from the library to keep a reading list.             |
| PDF                                        | Import the file into the library. PDF.js renders original pages with selectable text and page navigation. |
| EPUB                                       | Import a DRM-free file. Chapters follow the book's spine order; local book images are embedded.           |
| HTML, text, Markdown                       | Import into the reader. HTML is sanitized; text and Markdown are displayed as plain text.                 |

PDFs in the browser's built-in viewer must be downloaded and imported into Marginalia. Scanned pages without a text layer support page notes, flags, tabs, and bookmarks; OCR is not included. Encrypted EPUBs are not supported. Browser-internal pages, extension stores, closed shadow roots, and embedded cross-origin frames cannot be annotated. If a website removes a passage entirely, the quote remains searchable but its position may no longer be recoverable.

Files are limited to 75 MB per import. EPUB content is limited to 20 MB after extraction and embedding images. Large EPUBs are shown as a continuous document, not a paginated ebook layout. This version targets Chromium; Firefox packaging and account-based synchronization are not implemented.

## Your data

The extension handles user data locally; it should not be described as collecting or processing no data. Notes displayed in the on-page annotation panel can be read by the host website's scripts, including content in the hidden panel. Do not put confidential information there. Local storage and exports are not encrypted by Marginalia. See the [privacy policy](public/privacy.html), [privacy audit](store/PRIVACY-AUDIT.md), and [store disclosure answers](store/PRIVACY-DISCLOSURES.md). The audit describes its dated release artifact; later policy wording updates do not resolve the panel-isolation limitation.

No account, analytics, or remote backend. Extension records use `chrome.storage.local`; the preview uses localStorage. Original PDF files use IndexedDB. All fonts and runtime dependencies are bundled locally.

**Settings & backup → Export backup** downloads a versioned JSON file containing documents, annotations, labels, EPUB/HTML content, and imported PDF files. Import merges by record ID and retains newer local edits. Backup metadata is validated and imported HTML is sanitized when rendered. Browser storage can be cleared or removed with the extension, so export backups for safekeeping.

The manifest requests storage, unlimitedStorage, activeTab, and content script access to HTTP/HTTPS pages. Content scripts use that access to restore annotations on revisits. No page content is sent to a server. The toolbar remains hidden until opened, with a small badge on previously annotated pages.

## Verification

```sh
npm test
npm run build
npm run dev -- --port 4175
# In another terminal, with Playwright Chromium installed:
npm run test:browser
npm run test:extension
npm run test:folders
```

If necessary, install the test browser with `npx playwright install chromium`. `MARGINALIA_TEST_URL` changes the reading workspace test URL. The extension test uses a local intercepted fixture at port 4175 and a temporary browser profile, leaving the user's browser profile untouched.

Unit tests cover passage recovery, repeated-quote disambiguation, search filters, URL normalization, and backup validation. Browser checks exercise all seven tools, saved data after reload, editing, labels, bookmarks, sanitized HTML, EPUB import, PDF text selection and paging, backup export and restoration including PDF bytes, mobile layout, and the actual installed extension. Screenshots and test backups are written to ignored `test-results/`.

## Structure

- `src/App.jsx`: library, search, labels, imports, backup, and annotation editor.
- `src/Reader.jsx`: EPUB/HTML reader, PDF renderer, reading tools, and margin markers.
- `src/anchors.mjs`: DOM selection capture and CSS Highlight rendering.
- `src/model.mjs`: shared search, anchoring, types, and backup validation.
- `src/storage.mjs`: per-record persistence, file storage, backup export.
- `src/importers.mjs`: sanitized document import.
- `extension/`: Manifest V3 content script, popup, and background worker.
- `scripts/build-extension.mjs`: packages the website annotation bundle alongside the reading workspace.

Implementation references: [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), and [PDF.js](https://mozilla.github.io/pdf.js/).

Sample book excerpts are from _Pride and Prejudice_ and _The Secret Garden_. “Taking useful reading notes” is an original introductory sample. The samples are excerpts, not complete books.
