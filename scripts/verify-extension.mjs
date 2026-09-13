import { chromium, expect } from "@playwright/test";
import { resolve } from "node:path";
const extensionPath = resolve(process.env.MARGINALIA_EXTENSION_PATH || "dist");
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
  viewport: { width: 1300, height: 900 },
});
const errors = [];
try {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("http://127.0.0.1:4175/annotation-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><title>A website worth remembering</title></head><body style="font-family:Georgia;padding:60px;max-width:700px;line-height:2"><article><h1>A small reading test</h1><p id="passage">Some words are worth keeping. A passage can become a place to return to.</p><p>We leave a note, and find it again.</p></article></body></html>',
    }),
  );
  await page.goto("http://127.0.0.1:4175/annotation-fixture");
  await expect(page.locator("div[data-marginalia-ui]")).toHaveCount(1);
  await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    await chrome.tabs.sendMessage(tabs[0].id, { action: "marginalia:toggle" });
  });
  await expect(
    page.getByRole("heading", { name: "marginalia." }),
  ).toBeVisible();
  await page.locator("#passage").evaluate((el) => {
    const range = document.createRange();
    range.setStart(el.firstChild, 0);
    range.setEnd(el.firstChild, 29);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await expect(page.locator(".excerpt")).toContainText(
    "Some words are worth keeping.",
  );
  await page
    .getByLabel("Your note", { exact: true })
    .fill("A website annotation, persisted.");
  await page
    .getByLabel("Labels · separate with commas")
    .fill("Web test, To remember");
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Annotation saved.");
  expect(await page.evaluate(() => CSS.highlights.size)).toBe(1);
  await page.reload();
  await expect(page.locator(".badge")).toBeVisible();
  await expect.poll(() => page.evaluate(() => CSS.highlights.size)).toBe(1);
  await page.locator(".badge").click();
  await expect(page.locator(".items")).toContainText(
    "A website annotation, persisted.",
  );
  await page.getByRole("button", { name: "Sticky note", exact: true }).click();
  await page
    .getByLabel("Your note", { exact: true })
    .fill("Sticky thought at this position");
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click();
  await expect(page.locator(".items")).toContainText(
    "Sticky thought at this position",
  );
  await expect(page.locator(".marker")).toHaveCount(1);
  await page
    .locator(".items .item")
    .filter({ hasText: "A website annotation, persisted." })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByLabel("Your note", { exact: true })
    .fill("Edited website annotation");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".items")).toContainText(
    "Edited website annotation",
  );
  await page.screenshot({
    path: "test-results/website-extension.png",
    fullPage: true,
  });
  const library = await context.newPage();
  library.on("pageerror", (e) => errors.push(e.message));
  await library.goto(`chrome-extension://${id}/index.html`);
  await expect(library.locator(".book-card")).toContainText(
    "A website worth remembering",
  );
  await library.getByRole("button", { name: /All annotations/ }).click();
  await library.getByLabel("Search library and annotations").fill("Web test");
  await expect(
    library.locator(".all-annotations .annotation-card"),
  ).toHaveCount(1);
  await expect(library.locator(".all-annotations")).toContainText(
    "Edited website annotation",
  );
  await expect(library.locator(".logo")).toBeVisible();
  const policy = await context.newPage();
  await policy.goto(`chrome-extension://${id}/privacy.html`);
  await expect(
    policy.getByRole("heading", { name: "Privacy policy", exact: true }),
  ).toBeVisible();
  await expect(
    policy.getByRole("heading", { name: "Chrome Web Store Limited Use" }),
  ).toBeVisible();
  await library.getByRole("button", { name: "Settings & backup" }).click();
  await expect(
    library.getByRole("link", { name: "Privacy policy" }),
  ).toBeVisible();
  await library
    .getByRole("button", { name: "Delete all local reading data" })
    .click();
  await library.getByRole("button", { name: "Keep my library" }).click();
  await expect(library.getByRole("dialog")).toContainText("1 reading");
  await library
    .getByRole("button", { name: "Delete all local reading data" })
    .click();
  await library
    .getByRole("button", { name: "Delete everything", exact: true })
    .click();
  await expect(library.getByRole("status")).toContainText(
    "Local reading data deleted",
  );
  await expect(library.locator(".book-card")).toHaveCount(0);
  await library.reload();
  await expect(library.locator(".book-card")).toHaveCount(0);
  await page.bringToFront();
  try {
    await expect.poll(() => page.evaluate(() => CSS.highlights.size)).toBe(0);
  } catch (error) {
    console.log(
      "Deletion diagnostics",
      await worker.evaluate(async () => ({
        keys: Object.keys(await chrome.storage.local.get(null)),
      })),
      await page.evaluate(() => ({
        highlights: [...CSS.highlights.keys()],
        items: document
          .querySelector("div[data-marginalia-ui]")
          ?.shadowRoot?.querySelector(".items")?.textContent,
      })),
    );
    throw error;
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS: installed MV3 extension, on-page selection, notes and labels, reload restoration, sticky marker, editing, and shared searchable library.",
  );
} finally {
  await context.close();
}
