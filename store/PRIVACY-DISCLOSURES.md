# Chrome Web Store privacy practices — Marginalia 1.1.1

Audited September 12, 2026. These are copy-ready descriptions of the current packaged extension, not a certification of store approval. The publisher must confirm they also describe any separately operated website or support service.

## Audit conclusion

Do not claim that the extension collects or handles no user data. It processes and stores user-selected content and reading metadata locally. No developer-operated collection endpoint, telemetry, advertising SDK, or cloud-sync integration was found. In the tested annotation, search, folder, reload, and backup flows, there were no unexpected external requests.

Important limitation: the website annotation panel uses an open shadow root in the host page. Website scripts can read notes and labels rendered there, including hidden panel content. This was reproduced with synthetic data. Therefore, do not claim that on-page notes are inaccessible to websites or that user data can never leave the device. External source navigation and user-sent support email are additional user-initiated disclosures.

See [PRIVACY-AUDIT.md](PRIVACY-AUDIT.md) for scope, evidence, and limitations.

## Single purpose — paste into the form

Marginalia helps students annotate and organize reading material. Users can highlight websites, PDFs, and EPUBs; add notes, labels, and bookmarks; group readings and annotations into folders; and search their saved material. These features use a local reading library with user-controlled backup export and import.

## storage justification — paste into the form

The storage permission saves the user's readings, annotations, selected passages and surrounding text, notes, labels, colors, folders, bookmarks, source URLs, and reading metadata in chrome.storage.local. It lets the website annotation panel and extension library share saved records, restore highlights on return visits, and support search and backup. These records are stored locally, not synchronized to a developer server.

## unlimitedStorage justification — paste into the form

Imported PDFs and extracted EPUB or HTML content can exceed ordinary extension storage limits. unlimitedStorage supports the local reading library, with document content and annotations in extension storage and original PDF files in IndexedDB. Users choose which files to import and can export backups or delete local data. The extension does not upload imported files.

## activeTab justification — paste into the form

When the user clicks the extension on a browser tab, activeTab allows Marginalia to inspect that tab's URL, check whether website annotation is supported, and send a message to open the annotation panel. This permission is used for the user's explicit action, not to record a general browsing history.

## Host access justification — paste into the form

Marginalia's packaged content script runs on permitted HTTP and HTTPS pages to match the current URL against saved readings and restore existing highlights on return visits. When the user opens the panel, it captures selected text and saves annotations on request. Broad website matching supports user-chosen articles, course resources, and other reading sites. It does not persist a general list of visited pages or upload browsing activity.

This field refers to content_scripts.matches: http://*/* and https://*/*. There is no separate host_permissions entry. No tabs, scripting, history, cookies, identity, downloads, or geolocation permission is requested.

## Remote code

Select **No, I am not using remote code**.

Optional explanation to paste:

All JavaScript, third-party libraries, PDF workers, and WebAssembly resources are bundled in the extension package. Marginalia does not load executable code from external servers or CDNs. Imported HTML is sanitized, and document scripts are not executed. The wasm-unsafe-eval content-security-policy directive supports bundled PDF rendering resources; PDF.js JavaScript evaluation support is disabled.

wasm-unsafe-eval is a CSP directive, not a separately requested browser permission.

## Data usage — disclose local handling

Based on the current implementation, disclose:

- **Website content:** saved passages and surrounding text, document content, and user-written notes, labels, and folders.
- **Web history:** source URLs and titles for saved or annotated pages; current page URLs are also processed to locate existing annotations. This is not access to Chrome's history database or a general browsing log.
- **User activity:** limited reading-open and annotation save/edit timestamps, text anchors, and saved page/scroll positions used to return to annotations. There is no analytics log of general browsing, clicks, or keystrokes.
- **User-generated content, if offered separately:** notes, annotation labels, and folder names.

These categories are a mapping from the audited behavior to the dashboard; review the exact field descriptions shown during submission. Do not select a blanket “no user data” declaration because processing is local.

The extension has no dedicated collection feature for identity, payment details, credentials, health records, personal communications, or location. However, selected passages, notes, imported files, and saved URL query parameters can contain personal or sensitive data. Do not claim that the extension is technically incapable of storing such information.

## Data-use explanation — paste where requested

Marginalia processes reading material and annotations to provide its reading, organization, search, and backup features. Saved content, source URLs, folders, and reading metadata remain in the user's browser profile; the extension has no analytics, advertising, developer data server, or automatic cloud sync. Backups are exported locally at the user's request. Notes displayed in the website annotation panel are accessible to that website's scripts. Opening an external source or sending a support email is subject to the destination service's privacy practices.

## Limited-use certifications

The audited code contains no sale, advertising use, unrelated monetization, creditworthiness, or lending use of data. The following are explanations for the standard certifications; the publisher must personally verify them before checking the corresponding boxes:

### No sale or unrelated transfer

Marginalia does not sell user data or contain a developer upload service. Local data is used for the annotation features. Users may export backups, open source websites, or contact support. The on-page panel exposes the content it displays to the host page; do not describe it as an isolated private vault.

### No unrelated use

Readings and annotations are processed only to provide the extension's reading, highlighting, note-taking, organization, search, restoration, and backup functions. They are not used for advertising, profiling, model training, or unrelated services.

### No creditworthiness or lending use

Marginalia does not use or transfer user data to determine creditworthiness or for lending.

## Privacy policy URL and security limits

Use a publicly accessible HTTPS URL for the prepared privacy policy. Publisher: Sanah Rajesh. Public support email: leapon.outreach@gmail.com. The project has no configured public policy URL yet; an extension-local URL or local file path is not a substitute.

The extension does not implement its own encryption for stored data or exported backups. The policy already warns about local storage, backup security, and the visibility of on-page annotations. The policy text is not a substitute for addressing security risks or for review of current store requirements. This audit does not certify complete policy or legal compliance.

## Sources checked September 12, 2026

- [Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome User Data FAQ: local processing still requires disclosure](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Remotely hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
