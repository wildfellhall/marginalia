chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (
    message?.action === "marginalia:library" &&
    sender.id === chrome.runtime.id
  ) {
    chrome.tabs
      .create({ url: chrome.runtime.getURL("index.html") })
      .then(() => reply({ ok: true }));
    return true;
  }
});
