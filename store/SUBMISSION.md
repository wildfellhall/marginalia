# Chrome Web Store submission handoff

Prepared for version 1.1.1. This package has not been uploaded or submitted, and Chrome Web Store approval is not implied.

## Artifacts

- For Chrome's **Load unpacked** or **Pack extension** dialog, select the `release/Marginalia-Chrome/` directory. Its `manifest.json` is directly inside. Do not select the project root, `release/`, the source `extension/` directory, or the ZIP. The exact local path is also in `release/LOAD-OR-PACK.txt`.
- Upload `marginalia-1.1.1-chrome.zip` from `release/`. Its `manifest.json` is at the archive root. Do not upload the repository, `release/` directory, or a ZIP containing a `dist/` parent folder.
- `marginalia-1.1.1-chrome.zip.sha256` verifies the exact archive.
- Copy the store name, summary, and detailed description from `LISTING.md`.
- Use `PRIVACY-DISCLOSURES.md` for the single-purpose statement, permission explanations, remote-code answer, and local-data disclosures.
- `store-assets/` contains icons, the required 440 × 280 promo tile, and optional 1400 × 560 marquee.
- `screenshots/` contains five 1280 × 800 screenshots of the installed extension, using sample and demonstration content rather than private user data.
- `site/` is a ready-to-host static homepage, help page, and privacy policy, with local styles and icons. It has no forms or analytics. Host this directory over HTTPS and put its public URLs in the dashboard.
- `READINESS.json` lists package validation and remaining publisher setup. A packaged local privacy page does not satisfy the public-URL requirement by itself.

## Publisher tasks before submission

1. Publisher Sanah Rajesh and public support email leapon.outreach@gmail.com are set in `store/publisher.json`, the listing, and privacy/support pages. Hosted site URLs remain unfilled; the owner currently has no website or domain. Complete any contact verification required by the developer dashboard.
2. Host `release/site/` at an owner-approved HTTPS destination. Verify the homepage, privacy page, and help page open without login. The public site is not deployed by the preparation scripts.
3. Register/sign in to the Chrome Web Store Developer Dashboard and complete its account, contact verification, two-step verification, fee, and any applicable trader/business declarations. Use the owner's actual information; the package does not make these declarations.
4. Choose “New item” and upload only the extension ZIP. Review the parsed name, description, version, and icons.
5. Complete the listing, language/category, promotional artwork, screenshots, and support links. Choose distribution regions and visibility. Public-domain sample rights can vary by jurisdiction.
6. Enter the privacy disclosures. Explain the all-HTTP/HTTPS content script access: it restores annotations on repeat visits. Do not claim “no data handled”; user-selected website content, notes, and saved URLs are processed and stored locally.
7. Review and make the dashboard's data-use certifications, using the shipped policy. No remote code, telemetry, advertising, or developer cloud service is implemented.
8. Supply the reviewer instructions below. Complete any dashboard checks, then submit for review when ready. Publication is a separate publisher action.

## Reviewer instructions

No login, subscription, test credentials, or remote service is required.

1. Open the extension popup and choose “Open my library”. A clean installation shows three clearly labeled sample reads.
2. Open “Pride and Prejudice”. Select a sentence and choose “Annotate selection”. Add a note and comma-separated labels; choose a color; save.
3. Return to the library and use “All annotations” to search by the saved note, highlighted words, and labels. Edit or delete an annotation using its icons.
4. Open an ordinary HTTP/HTTPS webpage (for example a Project Gutenberg HTML text). Click the popup's “Annotate this page”. Select text, save a note, then reload. Highlights restore; the small Marginalia badge opens the saved notes.
5. Import a text-based PDF or DRM-free EPUB using “Add reading”. PDFs use Marginalia's bundled renderer; the extension does not inject into Chrome's built-in PDF viewer. Scanned PDFs have page notes/markers but no OCR.
6. Use Settings & backup to export a JSON backup; import it into an empty test installation. Imported PDF bytes and annotations restore. No network upload occurs.
7. The same settings provide local help/privacy pages and “Delete all local reading data”, which requires explicit confirmation. Exported backups are not removed by this action.

Bundled PDF.js uses local WebAssembly image decoders, so the CSP includes `wasm-unsafe-eval`. JavaScript eval support is disabled in PDF.js; there is no remotely hosted code.

## Rebuild and verify

```sh
npm ci
npm test
npm run build
npm run test:extension
npm run store:screenshots
npm run release
npm run release:test
npm run release:pack-test
```

`npm run release` rebuilds, packages the ZIP, copies the static site/assets, checks archive integrity and image dimensions, and writes readiness status. `npm run release:check -- --strict` exits nonzero while publisher fields are missing. Browser scripts use an isolated temporary Chromium profile; they never load or clear the user's own profile.

To run the complete reading/backup test suite, start `npm run dev -- --port 4175` and run `npm run test:browser` in another terminal. Install the test browser if needed using `npx playwright install chromium`.

For future updates, increment `package.json` and `extension/manifest.json` together before rebuilding. Keep backup formats backward compatible. Reassess privacy disclosures whenever data access, network behavior, permissions, or hosting changes.

Official references checked September 12, 2026: [prepare and ZIP layout](https://developer.chrome.com/docs/webstore/prepare), [artwork dimensions](https://developer.chrome.com/docs/webstore/images), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [publishing](https://developer.chrome.com/docs/webstore/publish/).
