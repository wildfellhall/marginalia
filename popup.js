document
  .getElementById("library")
  .addEventListener("click", () =>
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }),
  );
document.getElementById("annotate").addEventListener("click", async () => {
  const status = document.getElementById("status");
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id || !/^https?:/.test(tab.url || "")) {
      status.textContent =
        "Open a website to annotate. For PDFs and EPUBs, import the file into your library.";
      return;
    }
    await chrome.tabs.sendMessage(tab.id, { action: "marginalia:toggle" });
    window.close();
  } catch {
    status.textContent =
      "Refresh this page after installing Marginalia, then try again. Browser PDF viewers and protected pages cannot be annotated; import PDFs into the library.";
  }
});
