# Privacy audit — Marginalia 1.1.1

Date: September 12, 2026.

Artifact: `release/marginalia-1.1.1-chrome.zip`.

SHA-256: `bb560148435c124c98d46d539ce689cb5bf4610233156c3f8cd0d43bc9fbeac6`.

## Result

**The extension handles and stores user data. A “no user data collected or handled” claim is not supported.** No developer-operated upload endpoint, analytics SDK, advertising integration, or cloud-sync code was found in the reviewed implementation. No unexpected external requests were observed in the tested workflows.

**Confirmed privacy limitation:** host-page scripts can read saved notes rendered in the on-page annotation panel. This prevents a blanket assurance that notes are inaccessible to third parties, even though no extension-operated upload mechanism was found.

## Evidence

| Area | Finding | Source |
| --- | --- | --- |
| Annotations and folders | Saved in chrome.storage.local; preview uses localStorage | src/storage.mjs:3, src/storage.mjs:23 |
| Imported PDF files | Saved in local IndexedDB | src/storage.mjs, src/importers.mjs |
| Selected text | Captures quote, character offsets, and up to 40 characters of context on each side | src/anchors.mjs:16 |
| Website metadata | Saves URL including query parameters, title, hostname, and annotation timestamps on save | extension/content.js:244 |
| Current page | Processes URL to match saved readings; isolated visit without saving created no stored records | extension/content.js |
| Reading activity | Stores lastOpened when opening a saved document in the reader | src/App.jsx:178 |
| Backup | User-requested unencrypted JSON download, including local content and PDF bytes | src/storage.mjs |
| Remote executable code | PDF worker and WebAssembly resources are packaged; PDF.js evaluation disabled | src/Reader.jsx:495, extension/manifest.json |
| On-page exposure | Open shadow root; saved notes and labels are inserted into host-page DOM | extension/content.js:28, extension/content.js:164 |
| External navigation | Source links open external websites; support email is user initiated | src/App.jsx:173, public/help.html |

## Runtime check

- Compared every file in the unpacked release against the ZIP before testing.
- Loaded the released extension in a fresh temporary Chromium profile; no personal browser profile or saved library was used.
- Used an intercepted synthetic page at `https://privacy-fixture.example/reading?chapter=1`; the request was fulfilled locally.
- Verified website annotation creation, reload restoration, library search, folder creation, backup export, and backup import.
- Confirmed a visit without saving initially created no local records.
- Confirmed a saved annotation contained anchor, color, timestamps, document ID/title, annotation ID, labels, note, quote, scroll position, and type.
- Observed only two HTTP(S) requests, both GET navigations to the locally fulfilled synthetic page (initial visit and reload). No other HTTP(S) requests were observed; unexpected requests would have been recorded and blocked.
- Executed a DOM read in the host page's JavaScript context and successfully retrieved the synthetic saved note through the panel's open shadow root. No synthetic note was transmitted to a real server.

## Scope and limits

This is a source/package inspection and targeted runtime check, not a formal security assessment, proof about all code paths, or certification of Chrome Web Store approval. The runtime check did not exercise every file format, PDF decoder, malicious document, browser-level background request, or possible website script. Browser/store services, a future hosted support site, user-sent support messages, and deliberate external navigation have separate data practices.

No extension implementation, manifest, permissions, privacy policy, or store submission was changed during this audit. Only the audit and submission guidance documents were updated.

## Recommended follow-up (not implemented)

Move note entry and saved-note text out of the host-page DOM into a browser-isolated extension UI, and avoid putting private note text in page-visible marker attributes. Merely changing the shadow root to closed should not be treated as a full security boundary. Re-test before claiming notes are private from the host website.

Review storage/backup security and prominent disclosures against current requirements before submission. The extension does not provide its own at-rest encryption, and the public HTTPS policy URL is still unconfigured.

For the copy-ready form answers, use [PRIVACY-DISCLOSURES.md](PRIVACY-DISCLOSURES.md). Chrome explicitly requires disclosure even for local-only handling: [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
