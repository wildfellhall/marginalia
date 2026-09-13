import { chromium, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir("store/screenshots", { recursive: true });
const extensionPath = resolve("dist");
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const errors = [];
try {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${id}/index.html`);
  await expect(page.locator(".book-card")).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "store/screenshots/01-reading-library.png" });
  await page
    .locator(".book-card")
    .filter({ has: page.getByRole("heading", { name: "Pride and Prejudice" }) })
    .click();
  await expect(page.locator(".prose")).toContainText(
    "truth universally acknowledged",
  );
  await page.screenshot({ path: "store/screenshots/02-book-reader.png" });
  await page
    .locator(".prose p")
    .first()
    .evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
  await page.getByRole("button", { name: "Annotate selection" }).click();
  await page
    .getByLabel("Annotation tool", { exact: true })
    .selectOption("margin");
  await page
    .getByLabel("Your note", { exact: true })
    .fill(
      "The opening already questions whose wishes shape the story. Return to this after meeting Elizabeth.",
    );
  await page
    .getByLabel("Labels separate with commas")
    .fill("Characters, First impressions");
  await page
    .getByRole("button", { name: "Lavender color", exact: true })
    .last()
    .click();
  await page.screenshot({ path: "store/screenshots/03-notes-and-colors.png" });
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click();
  await page.getByRole("button", { name: "My library", exact: true }).click();
  await page.getByRole("button", { name: /All annotations/ }).click();
  await page.getByLabel("Search library and annotations").fill("Review");
  await expect(page.locator(".all-annotations .annotation-card")).toHaveCount(
    2,
  );
  await expect(page.locator(".toast")).toHaveCount(0, { timeout: 8000 });
  await page.screenshot({ path: "store/screenshots/04-search-and-labels.png" });

  // A local, original demonstration article; no user history or private content.
  const article = await context.newPage();
  article.on("pageerror", (e) => errors.push(e.message));
  await article.route("https://marginalia.example/reading-slowly", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Taking useful reading notes</title><style>body{margin:0;background:#fbfaf6;color:#555c4b;font:18px/1.95 Georgia,serif}header{padding:25px 60px;border-bottom:1px solid #e3e5da;font-size:14px;color:#859175}main{max-width:690px;margin:48px 0 0 65px}h1{font-size:42px;line-height:1.25;font-weight:400;margin:16px 0 26px}h2{font-size:25px;font-weight:400;margin-top:32px}p{margin:20px 0}.eyebrow{font:10px Arial,sans-serif;letter-spacing:2px;color:#929b84}.byline{font-size:12px;color:#9ba18f}strong{font-weight:400}</style></head><body><header>MARGINALIA STUDY GUIDE · DEMONSTRATION ARTICLE</header><main><span class="eyebrow">READING NOTES</span><h1>Taking useful reading notes</h1><p class="byline">A sample annotation guide</p><p>Before reading, check what you need to do with the text. A class discussion, an essay, and an exam may call for different notes.</p><p id="passage">Write a short explanation in your own words beside each important passage.</p><h2>Choose what to highlight</h2><p>Look for the main claim, key definitions, and supporting evidence. Add a note explaining why a passage matters.</p><p>Use a folder for each course or assignment. Labels help you find related notes across different readings.</p></main></body></html>`,
    }),
  );
  await article.goto("https://marginalia.example/reading-slowly");
  await expect(article.locator("div[data-marginalia-ui]")).toHaveCount(1);
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    await chrome.tabs.sendMessage(tab.id, { action: "marginalia:toggle" });
  });
  await article.locator("#passage").evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await expect(article.locator(".excerpt")).toContainText(
    "explanation in your own words",
  );
  await article
    .getByLabel("Your note", { exact: true })
    .fill("Before class: summarize the main claim and find one example that supports it.");
  await article
    .getByLabel("Labels · separate with commas")
    .fill("Review, Study methods");
  await article
    .getByRole("button", { name: "Save annotation", exact: true })
    .click();
  await expect(article.getByRole("status")).toContainText("Annotation saved.");
  await article.screenshot({
    path: "store/screenshots/05-website-annotation.png",
  });
  expect(errors).toEqual([]);
  console.log(
    "Captured five 1280 × 800 PNGs from the installed extension, using sample and original demonstration content.",
  );
} finally {
  await context.close();
}
