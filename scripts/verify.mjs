import { chromium, expect } from "@playwright/test";
import JSZip from "jszip";
import { mkdir } from "node:fs/promises";
const base = process.env.MARGINALIA_TEST_URL || "http://127.0.0.1:4175";
await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function selectPassage(selector, text) {
  await page.locator(selector).evaluate((el, text) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode,
        i = n.textContent.indexOf(text);
      if (i >= 0) {
        const range = document.createRange();
        range.setStart(n, i);
        range.setEnd(n, i + text.length);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        return;
      }
    }
    throw new Error("Selection text not found");
  }, text);
}
try {
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "Your library" }),
  ).toBeVisible();
  await expect(page.locator(".book-card")).toHaveCount(3);
  await page.screenshot({
    path: "test-results/library-desktop.png",
    fullPage: true,
  });
  await page
    .locator(".book-card")
    .filter({ has: page.getByRole("heading", { name: "Pride and Prejudice" }) })
    .click();
  await expect(page.locator(".prose")).toContainText(
    "truth universally acknowledged",
  );
  await selectPassage(".prose", "Mr. Bennet replied that he had not.");
  await page.getByRole("button", { name: "Annotate selection" }).click();
  await page
    .getByLabel("Your note", { exact: true })
    .fill("A quietly funny reply — saved in this test.");
  await page
    .getByLabel("Labels separate with commas")
    .fill("Testing, Character study");
  await page
    .getByRole("button", { name: "Rose color", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click();
  await expect(page.locator(".reader-note-list")).toContainText(
    "A quietly funny reply",
  );
  const highlightCount = await page.evaluate(() => CSS.highlights.size);
  expect(highlightCount).toBeGreaterThanOrEqual(2);
  for (const tool of [
    "Underline",
    "Margin note",
    "Sticky note",
    "Flag",
    "Tab",
    "Bookmark",
  ]) {
    if (["Underline", "Margin note"].includes(tool))
      await selectPassage(".prose", "Mr. Bennet made no answer.");
    await page.getByRole("button", { name: tool, exact: true }).click();
    await page
      .getByLabel("Your note", { exact: true })
      .fill(`Verified ${tool} annotation`);
    await page
      .getByRole("button", { name: "Save annotation", exact: true })
      .click();
    await expect(page.locator(".reader-note-list")).toContainText(
      `Verified ${tool} annotation`,
    );
  }
  await page.screenshot({
    path: "test-results/reader-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "My library", exact: true }).click();
  await page.getByRole("button", { name: /All annotations/ }).click();
  await page
    .getByLabel("Search library and annotations")
    .fill("quietly Character");
  await expect(page.locator(".all-annotations .annotation-card")).toHaveCount(
    1,
  );
  await page.reload();
  await expect(page.locator(".book-card")).toHaveCount(3);
  await page.getByRole("button", { name: /All annotations/ }).click();
  await page.getByLabel("Search library and annotations").fill("quietly");
  await expect(page.locator(".all-annotations")).toContainText(
    "A quietly funny reply",
  );
  await page
    .getByRole("button", { name: "Edit annotation", exact: true })
    .click();
  await page
    .getByLabel("Your note", { exact: true })
    .fill("Edited and remembered.");
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click();
  await page
    .getByLabel("Search library and annotations")
    .fill("Edited and remembered");
  await expect(page.locator(".annotation-card")).toHaveCount(1);
  await page.getByRole("button", { name: /Bookmarks/ }).click();
  await expect(page.locator(".all-annotations")).toContainText(
    "Verified Bookmark annotation",
  );
  await page.getByRole("button", { name: /My library/ }).click();
  await page.getByRole("button", { name: "Add reading" }).click();
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "test-article.html",
    mimeType: "text/html",
    buffer: Buffer.from(
      '<h2>A test article</h2><p>A passage to remember.</p><script>window.untrustedExecuted=true</script><img src="https://tracking.invalid/pixel" onerror="alert(1)">',
    ),
  });
  await expect(page.locator(".book-card")).toHaveCount(4);
  await page.locator(".book-card").filter({ hasText: "test article" }).click();
  await expect(page.locator(".prose")).toContainText("A passage to remember.");
  expect(await page.locator(".prose script,.prose img").count()).toBe(0);
  await page.getByRole("button", { name: "My library", exact: true }).click();
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>',
  );
  zip.file(
    "OEBPS/book.opf",
    '<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>The Test Garden</dc:title><dc:creator>A Reader</dc:creator></metadata><manifest><item id="c1" href="chapter.xhtml"/></manifest><spine><itemref idref="c1"/></spine></package>',
  );
  zip.file(
    "OEBPS/chapter.xhtml",
    "<html><body><h2>First chapter</h2><p>A garden of persistent thoughts.</p></body></html>",
  );
  await page.getByRole("button", { name: "Add reading" }).click();
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "test.epub",
    mimeType: "application/epub+zip",
    buffer: await zip.generateAsync({ type: "nodebuffer" }),
  });
  await page
    .locator(".book-card")
    .filter({ hasText: "The Test Garden" })
    .click();
  await expect(page.locator(".prose")).toContainText(
    "A garden of persistent thoughts.",
  );
  await page.getByRole("button", { name: "My library", exact: true }).click();
  // A minimal real PDF, including a correct cross-reference table.
  const stream = "BT /F1 20 Tf 50 700 Td (A PDF passage to remember.) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  ];
  let pdf = "%PDF-1.4\n",
    offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  await page.getByRole("button", { name: "Add reading" }).click();
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "test-document.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await page.locator(".book-card").filter({ hasText: "test document" }).click();
  await expect(page.locator(".textLayer")).toContainText(
    "A PDF passage to remember.",
  );
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await selectPassage(".textLayer", "A PDF passage to remember.");
  await page.getByRole("button", { name: "Annotate selection" }).click();
  await page
    .getByLabel("Your note", { exact: true })
    .fill("PDF selection saved");
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await expect(page.locator(".textLayer")).toContainText(
    "A PDF passage to remember.",
  );
  await page.screenshot({
    path: "test-results/pdf-reader.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 900, height: 900 });
  await expect
    .poll(() =>
      page
        .locator(".pdf-page canvas")
        .evaluate((canvas) =>
          Math.abs(
            canvas.width / devicePixelRatio -
              canvas.getBoundingClientRect().width,
          ),
        ),
    )
    .toBeLessThan(2);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await expect
    .poll(() =>
      page
        .locator(".pdf-page canvas")
        .evaluate((canvas) =>
          Math.abs(
            canvas.width / devicePixelRatio -
              canvas.getBoundingClientRect().width,
          ),
        ),
    )
    .toBeLessThan(2);
  await page.getByRole("button", { name: "My library", exact: true }).click();
  await page.getByRole("button", { name: "Settings & backup" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  await download.saveAs("test-results/backup.json");
  await expect(page.getByRole("status")).toContainText("backup is ready");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/library-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const restoredContext = await browser.newContext();
  const restored = await restoredContext.newPage();
  restored.on("pageerror", (e) => errors.push(e.message));
  await restored.goto(base);
  await expect(restored.locator(".book-card")).toHaveCount(3);
  await restored.getByRole("button", { name: "Settings & backup" }).click();
  await restored
    .locator("input[type=file]:not([multiple])")
    .setInputFiles("test-results/backup.json");
  await expect(restored.locator(".book-card")).toHaveCount(6);
  await restored
    .locator(".book-card")
    .filter({ hasText: "test document" })
    .click();
  await expect(restored.locator(".textLayer")).toContainText(
    "A PDF passage to remember.",
  );
  await expect(restored.locator(".reader-note-list")).toContainText(
    "PDF selection saved",
  );
  await restored
    .getByRole("button", { name: "My library", exact: true })
    .click();
  await restored.getByRole("button", { name: "Settings & backup" }).click();
  await restored.evaluate(() => localStorage.setItem("unrelated:keep", "safe"));
  await restored
    .getByRole("button", { name: "Delete all local reading data" })
    .click();
  await restored
    .getByRole("button", { name: "Delete everything", exact: true })
    .click();
  await expect(restored.locator(".book-card")).toHaveCount(0);
  expect(
    await restored.evaluate(() => localStorage.getItem("unrelated:keep")),
  ).toBe("safe");
  const filesRemaining = await restored.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("marginalia-files", 1);
        req.onsuccess = () => {
          const database = req.result;
          const count = database
            .transaction("files", "readonly")
            .objectStore("files")
            .count();
          count.onsuccess = () => {
            database.close();
            resolve(count.result);
          };
          count.onerror = () => reject(count.error);
        };
        req.onerror = () => reject(req.error);
      }),
  );
  expect(filesRemaining).toBe(0);
  await restored.reload();
  await expect(restored.locator(".book-card")).toHaveCount(0);
  await restoredContext.close();
  expect(errors).toEqual([]);
  console.log(
    "PASS: all seven tools, persistence, edit, label/text search, bookmarks, HTML sanitization, EPUB import, PDF text selection and paging, backup export and restore including PDF files, and mobile overflow.",
  );
} finally {
  await context.close();
  await browser.close();
}
