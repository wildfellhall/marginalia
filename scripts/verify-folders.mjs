import { chromium, expect } from "@playwright/test";
import { resolve } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { validateBackup } from "../src/model.mjs";

const extensionPath = resolve(process.env.MARGINALIA_EXTENSION_PATH || "dist");
await mkdir("test-results", { recursive: true });
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  acceptDownloads: true,
  viewport: { width: 1440, height: 1050 },
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});
const errors = [];
try {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `chrome-extension://${new URL(worker.url()).host}/index.html`,
  );
  await expect(page.locator(".book-card")).toHaveCount(3);
  const dialog = page.getByRole("dialog");
  const saveOrganization = async () => {
    await dialog.getByRole("button", { name: "Save organization" }).click();
    await expect(dialog).toHaveCount(0);
  };
  const createFromPicker = async (name) => {
    await dialog.getByLabel("New folder name").fill(name);
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
  };
  await page
    .getByRole("button", {
      name: "Organize Pride and Prejudice into folders",
      exact: true,
    })
    .click();
  await createFromPicker("Literary favorites");
  await createFromPicker("Book club");
  await saveOrganization();
  await page.getByRole("button", { name: /My folders/ }).click();
  await expect(page.locator(".folder-card")).toHaveCount(3);
  await page
    .locator(".folder-card")
    .filter({ hasText: "Literary favorites" })
    .click();
  await expect(page.locator(".folder-read")).toHaveCount(1);
  const inherited = await page.locator(".folder-annotation").count();
  expect(inherited).toBeGreaterThan(0);
  await page
    .locator(".folder-annotation")
    .first()
    .getByRole("button", { name: "Organize annotation into folders" })
    .click();
  await expect(dialog).toContainText("Already included with its book");
  await dialog.getByRole("checkbox", { name: /Literary favorites/ }).check();
  await createFromPicker("Passages to ponder");
  await saveOrganization();
  await page
    .getByRole("button", { name: "Remove Pride and Prejudice from folder" })
    .click();
  await expect(page.locator(".folder-read")).toHaveCount(0);
  await expect(page.locator(".folder-annotation")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit folder", exact: true }).click();
  await dialog.getByLabel("Folder name").fill("Thoughts worth keeping");
  await dialog.getByRole("button", { name: "Rose color", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Save folder", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thoughts worth keeping", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /My folders/ }).click();
  await expect(
    page.locator(".folder-card").filter({ hasText: "Thoughts worth keeping" }),
  ).toHaveCSS("--folder-color", "#edc9ce");
  await page.screenshot({
    path: "test-results/folders-desktop.png",
    fullPage: true,
  });
  await page.locator(".folder-card").filter({ hasText: "Book club" }).click();
  await page
    .getByLabel("Search library and annotations")
    .fill("nonexistent phrase");
  await expect(page.locator(".folder-read")).toHaveCount(0);
  await expect(page.locator(".folder-annotation")).toHaveCount(0);
  await page.getByLabel("Search library and annotations").fill("Pride");
  await expect(page.locator(".folder-read")).toHaveCount(1);
  for (const query of ["universally acknowledged", "society", "Review"]) {
    await page.getByLabel("Search library and annotations").fill(query);
    await expect(page.locator(".folder-annotation")).toHaveCount(1);
  }
  await page.getByLabel("Search library and annotations").fill("");
  await page.screenshot({
    path: "test-results/folder-detail-desktop.png",
    fullPage: true,
  });
  await page.locator(".folder-read-open").click();
  await page
    .getByRole("button", { name: "Organize into folders", exact: true })
    .click();
  await expect(
    dialog.getByRole("checkbox", { name: "Book club", exact: true }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .locator(".reader-note-list .annotation-card")
    .first()
    .getByRole("button", { name: "Organize annotation into folders" })
    .click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "My library", exact: true }).click();
  await page.getByRole("button", { name: "Settings & backup" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export backup/ }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  const backup = validateBackup(JSON.parse(await readFile(backupPath, "utf8")));
  expect(backup.folders).toHaveLength(3);
  // Restore into cleared, isolated extension storage; never touches a user's profile.
  await worker.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ "marginalia:initialized": true });
  });
  await page.reload();
  await expect(page.locator(".book-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings & backup" }).click();
  await page
    .locator('input[type="file"][accept=".json"]')
    .setInputFiles(backupPath);
  await expect(page.getByRole("status")).toContainText("Backup merged");
  await expect(page.locator(".book-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Settings & backup" }).click();
  const { folders: omittedFolders, ...legacyBackup } = backup;
  await page
    .locator('input[type="file"][accept=".json"]')
    .setInputFiles({
      name: "legacy-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacyBackup)),
    });
  await expect(dialog).toHaveCount(0);
  expect(
    await worker.evaluate(
      async () =>
        Object.keys(await chrome.storage.local.get(null)).filter((key) =>
          key.startsWith("marginalia:folder:"),
        ).length,
    ),
  ).toBe(3);
  await page.getByRole("button", { name: /My folders/ }).click();
  await page
    .locator(".folder-card")
    .filter({ hasText: "Thoughts worth keeping" })
    .click();
  await expect(page.locator(".folder-annotation")).toHaveCount(1);
  await page
    .locator(".folder-annotation")
    .getByRole("button", { name: "Delete annotation", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Delete annotation", exact: true })
    .click();
  await expect(page.locator(".folder-annotation")).toHaveCount(0);
  const afterDelete = await worker.evaluate(async () =>
    Object.values(await chrome.storage.local.get(null)).filter(
      (r) => r?.annotationIds,
    ),
  );
  expect(afterDelete.flatMap((f) => f.annotationIds)).toHaveLength(0);
  await page.getByRole("button", { name: "All folders", exact: true }).click();
  await page.locator(".folder-card").filter({ hasText: "Book club" }).click();
  await page
    .getByRole("button", { name: "Delete folder", exact: true })
    .click();
  await expect(dialog).toContainText("All books and annotations will stay");
  await dialog
    .getByRole("button", { name: "Delete folder", exact: true })
    .click();
  await expect(
    page.locator(".folder-card").filter({ hasText: "Book club" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /My library/ }).click();
  await expect(page.locator(".book-card")).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /My folders/ }).click();
  await page.getByRole("button", { name: "New folder", exact: true }).click();
  await dialog.getByLabel("Folder name").fill("Mobile collection");
  await dialog
    .getByRole("button", { name: "Create folder", exact: true })
    .click();
  await expect(
    page.locator(".folder-card").filter({ hasText: "Mobile collection" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/folders-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const button of await page.locator(".sidebar nav .nav-item").all()) {
    const box = await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("button", { name: "Settings & backup" }).click();
  await dialog
    .getByRole("button", { name: "Delete all local reading data" })
    .click();
  await dialog
    .getByRole("button", { name: "Delete everything", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Local reading data deleted",
  );
  await page.reload();
  await page.getByRole("button", { name: /My folders/ }).click();
  await expect(page.locator(".folder-card:not(.new-folder-card)")).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
  console.log(
    "PASS: installed-extension folders, multiple memberships, inheritance, rename/color, reload, search, reader controls, backup restore, safe deletion, and mobile layout.",
  );
} finally {
  await context.close();
}
