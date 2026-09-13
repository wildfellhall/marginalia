import {
  anchorRange,
  captureAnchor,
  paintAnnotations,
} from "../src/anchors.mjs";
import { canonicalUrl, COLORS, TYPES, TYPE_NAMES, uid } from "../src/model.mjs";
import { putRecord, readLibrary } from "../src/storage.mjs";

// A shadow root keeps the annotation controls independent of a site's styles.
if (!globalThis.__marginaliaLoaded) {
  globalThis.__marginaliaLoaded = true;
  let address = canonicalUrl(location.href),
    doc = null,
    annotations = [],
    enabled = false,
    anchor = null,
    color = COLORS[0].value,
    type = "highlight",
    editing = null,
    cleanup = () => {},
    pending = false,
    navigationTimer,
    refreshGeneration = 0;
  const host = document.createElement("div");
  host.dataset.marginaliaUi = "";
  host.style.cssText =
    "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host{all:initial;color:#566449;font:13px Georgia,serif}*{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer;color:#6b7e56;background:#eff3e7;border:1px solid #d4ddc8;border-radius:4px;padding:7px 9px}button:hover{background:#e3ebd7}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #899c72;outline-offset:3px}.panel{font:13px Georgia,serif;color:#566449;pointer-events:auto;position:fixed;right:22px;top:22px;width:min(315px,calc(100vw - 44px));max-height:calc(100vh - 44px);overflow:auto;background:#f9f8f2;border:1px solid #cfd9c3;border-radius:7px;padding:18px}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}.header h2{font-size:24px;letter-spacing:-.7px;font-weight:400;margin:0}.close{border:0;background:none;font-size:21px;padding:0 5px;color:#92a27e}p{font-size:11px;line-height:1.7;color:#949e87;margin:10px 0}.tools{display:flex;gap:5px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #e0e5d7}.tools button{font-size:10px}.tools button.active{background:#dce6ce;border-color:#a7b895}.colors{display:flex;align-items:center;gap:9px;padding:14px 0}.color{width:22px;height:22px;border-radius:50%;padding:0;color:#64734f;border:1px solid #0000000d}.color.selected{outline:1px solid #97a785;outline-offset:2px}.custom{width:26px;height:24px;padding:0;border:0;background:none;cursor:pointer}.excerpt{border-left:3px solid #cfdbbc;padding:7px 0 7px 11px;font-size:12px;line-height:1.7;max-height:130px;overflow:auto;white-space:pre-wrap;color:#738062}label{display:block;font-size:10px;margin:13px 0 7px;color:#899579}textarea,input[type=text]{width:100%;border:1px solid #dbe2cf;background:#fefdf8;padding:9px;border-radius:4px;color:#63764f;font-size:12px;line-height:1.6;resize:vertical}.save{background:#6c7e59;border-color:#6c7e59;color:white;width:100%;margin-top:12px}.save:hover{background:#596e44}.status{font-size:10px;line-height:1.6;color:#859774;min-height:17px;margin:9px 0}.list{border-top:1px solid #e0e5d7;margin-top:13px;padding-top:10px}.item{padding:12px 0;border-bottom:1px solid #e7ebdf}.item-quote{background:none;border:0;border-left:3px solid #d5dfc9;border-radius:0;text-align:left;width:100%;font-size:11px;line-height:1.7;padding:5px 9px;white-space:pre-wrap}.item-note{font-size:11px;line-height:1.7;white-space:pre-wrap;color:#8e9a7c;margin:8px 0}.meta{display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#a0aa92}.meta button{font-size:9px;padding:3px 7px}.labels{font-size:9px;color:#9aa587;margin:7px 0}.bottom{display:flex;justify-content:space-between;align-items:center;margin-top:16px}.library{font-size:11px;background:none;border:0;padding:0}.saved{font-size:9px;color:#a0ab90}.marker{position:fixed;right:2px;pointer-events:auto;border:1px solid #c3cfae;border-radius:3px 0 0 3px;width:17px;height:23px;padding:0;color:#65734f;font-size:10px}.badge{pointer-events:auto;position:fixed;right:14px;bottom:18px;background:#eff3e7;border:1px solid #cbd6bd;border-radius:5px;padding:9px 13px;font-size:12px}.warning{color:#aa6b66}.hidden{display:none!important}
  `;
  shadow.append(style);
  const panel = document.createElement("aside");
  panel.className = "panel hidden";
  panel.setAttribute("aria-label", "Marginalia annotation tools");
  panel.innerHTML =
    '<div class="header"><h2>marginalia.</h2><button class="close" aria-label="Close annotations">×</button></div><p>Study notes &amp; highlights</p><div class="tools"></div><div class="colors"></div><p class="hint">Select a passage on this page, or leave a note at your current position.</p><blockquote class="excerpt hidden"></blockquote><label for="m-note">Your note</label><textarea id="m-note" rows="3" placeholder="Add an explanation, question, or reminder…"></textarea><label for="m-labels">Labels · separate with commas</label><input id="m-labels" type="text" placeholder="Key terms, Essay evidence, Review…"><button class="save">Save annotation</button><div class="status" role="status"></div><div class="list"><label for="m-search">Find on this page</label><input id="m-search" type="text" placeholder="Search passages, notes, labels…"><div class="items"></div></div><div class="bottom"><button class="library">Open my library ↗</button><span class="saved">Saved on this device</span></div>';
  shadow.append(panel);
  const markers = document.createElement("div");
  shadow.append(markers);
  const badge = document.createElement("button");
  badge.className = "badge hidden";
  badge.textContent = "✧ marginalia";
  shadow.append(badge);
  document.documentElement.append(host);
  const $ = (selector) => panel.querySelector(selector),
    setStatus = (text, error = false) => {
      $(".status").textContent = text;
      $(".status").classList.toggle("warning", error);
    };
  function resetDraft() {
    anchor = null;
    editing = null;
    $("#m-note").value = "";
    $("#m-labels").value = "";
    $(".excerpt").classList.add("hidden");
    $(".save").textContent = "Save annotation";
  }
  function renderTools() {
    const wrap = $(".tools");
    wrap.replaceChildren();
    for (const t of TYPES) {
      const b = document.createElement("button");
      b.textContent = TYPE_NAMES[t];
      b.className = t === type ? "active" : "";
      b.setAttribute("aria-pressed", String(t === type));
      b.onclick = () => {
        type = t;
        renderTools();
      };
      wrap.append(b);
    }
    const colors = $(".colors");
    colors.replaceChildren();
    for (const c of COLORS) {
      const b = document.createElement("button");
      b.className = "color" + (c.value === color ? " selected" : "");
      b.style.background = c.value;
      b.title = c.name;
      b.setAttribute("aria-label", c.name + " color");
      b.textContent = c.value === color ? "✓" : "";
      b.onclick = () => {
        color = c.value;
        renderTools();
      };
      colors.append(b);
    }
    const custom = document.createElement("input");
    custom.type = "color";
    custom.value = color;
    custom.className = "custom";
    custom.setAttribute("aria-label", "Custom color");
    custom.oninput = () => {
      color = custom.value;
    };
    colors.append(custom);
  }
  function show() {
    enabled = true;
    panel.classList.remove("hidden");
    badge.classList.add("hidden");
    renderTools();
    renderList();
  }
  function hide() {
    enabled = false;
    panel.classList.add("hidden");
    badge.classList.toggle("hidden", !annotations.length);
  }
  function go(a) {
    const range = a.anchor && anchorRange(document.body, a.anchor);
    if (range) {
      range.startContainer.parentElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else if (!a.anchor) {
      window.scrollTo({ top: a.scrollY || 0, behavior: "smooth" });
    } else {
      setStatus(
        "The source text has changed. Your saved passage is still in your library.",
        true,
      );
    }
  }
  function edit(a) {
    editing = a;
    anchor = a.anchor;
    color = a.color;
    type = a.type;
    $("#m-note").value = a.note;
    $("#m-labels").value = a.labels.join(", ");
    $(".excerpt").textContent = a.quote;
    $(".excerpt").classList.toggle("hidden", !a.quote);
    $(".save").textContent = "Save changes";
    renderTools();
    panel.scrollTop = 0;
  }
  function renderList() {
    const wrap = $(".items");
    wrap.replaceChildren();
    const query = $("#m-search").value.toLowerCase();
    for (const a of annotations.filter((a) =>
      [a.quote, a.note, ...a.labels].join(" ").toLowerCase().includes(query),
    )) {
      const item = document.createElement("div");
      item.className = "item";
      const meta = document.createElement("div");
      meta.className = "meta";
      const label = document.createElement("span");
      label.textContent = TYPE_NAMES[a.type];
      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.onclick = () => edit(a);
      meta.append(label, editButton);
      const quote = document.createElement("button");
      quote.className = "item-quote";
      quote.textContent = a.quote || TYPE_NAMES[a.type] + " at saved position";
      quote.style.borderColor = a.color;
      quote.onclick = () => go(a);
      const note = document.createElement("div");
      note.className = "item-note";
      note.textContent = a.note;
      const labels = document.createElement("div");
      labels.className = "labels";
      labels.textContent = a.labels.join(" · ");
      item.append(meta, quote, note, labels);
      wrap.append(item);
    }
  }
  function renderMarkers() {
    markers.replaceChildren();
    for (const a of annotations.filter((a) =>
      ["flag", "tab", "bookmark", "sticky", "margin"].includes(a.type),
    )) {
      const range = a.anchor && anchorRange(document.body, a.anchor);
      const y = range
        ? range.getBoundingClientRect().top
        : (a.scrollY || 0) - window.scrollY;
      if (y < 0 || y > window.innerHeight) continue;
      const m = document.createElement("button");
      m.className = "marker";
      m.style.top = Math.max(3, y) + "px";
      m.style.background = a.color;
      m.textContent = {
        flag: "⚑",
        tab: "▰",
        bookmark: "◆",
        sticky: "▤",
        margin: "✎",
      }[a.type];
      m.title = a.note || a.quote || TYPE_NAMES[a.type];
      m.onclick = () => {
        show();
        go(a);
        edit(a);
      };
      markers.append(m);
    }
  }
  async function refresh() {
    const generation = ++refreshGeneration;
    const data = await readLibrary();
    if (generation !== refreshGeneration) return;
    doc = data.documents.find((d) => d.url === address && !d.sample) || null;
    annotations = doc
      ? data.annotations.filter((a) => a.documentId === doc.id)
      : [];
    cleanup();
    cleanup = paintAnnotations(document.body, annotations, "web");
    renderMarkers();
    renderList();
    badge.classList.toggle("hidden", enabled || !annotations.length);
  }
  document.addEventListener("mouseup", (event) => {
    if (!enabled || event.composedPath().includes(host)) return;
    setTimeout(() => {
      const s = window.getSelection();
      if (!s?.rangeCount || s.isCollapsed) return;
      const selected = captureAnchor(document.body, s.getRangeAt(0));
      if (!selected?.exact.trim()) return;
      anchor = selected;
      editing = null;
      $(".excerpt").textContent = anchor.exact;
      $(".excerpt").classList.remove("hidden");
      $(".save").textContent = "Save annotation";
      setStatus("Passage selected. Add a note or save the highlight.");
    }, 0);
  });
  document.addEventListener("keyup", (event) => {
    if (event.shiftKey && enabled && !event.composedPath().includes(host)) {
      const s = window.getSelection();
      if (s?.rangeCount && !s.isCollapsed) {
        anchor = captureAnchor(document.body, s.getRangeAt(0));
        if (anchor) {
          $(".excerpt").textContent = anchor.exact;
          $(".excerpt").classList.remove("hidden");
        }
      }
    }
  });
  $(".save").onclick = async () => {
    if (pending) return;
    if (["highlight", "underline"].includes(type) && !anchor) {
      setStatus("Select some text on the page first.", true);
      return;
    }
    pending = true;
    $(".save").disabled = true;
    try {
      if (!doc) {
        doc = {
          id: uid(),
          url: address,
          title: document.title || location.hostname,
          author: location.hostname,
          format: document.querySelector("article") ? "Article" : "Website",
          theme: "sage",
          createdAt: new Date().toISOString(),
        };
        await putRecord("doc", doc);
      }
      const a = {
        ...(editing || {}),
        id: editing?.id || uid(),
        documentId: doc.id,
        documentTitle: doc.title,
        quote: anchor?.exact || "",
        anchor,
        note: $("#m-note").value,
        labels: [
          ...new Set(
            $("#m-labels")
              .value.split(",")
              .map((v) => v.trim().slice(0, 100))
              .filter(Boolean),
          ),
        ].slice(0, 100),
        type,
        color,
        scrollY: editing?.scrollY ?? window.scrollY,
        createdAt: editing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await putRecord("ann", a);
      resetDraft();
      window.getSelection()?.removeAllRanges();
      await refresh();
      setStatus("Annotation saved.");
    } catch (e) {
      setStatus("Could not save: " + e.message, true);
    } finally {
      pending = false;
      $(".save").disabled = false;
    }
  };
  $(".close").onclick = hide;
  badge.onclick = show;
  $("#m-search").oninput = renderList;
  $(".library").onclick = () =>
    chrome.runtime.sendMessage({ action: "marginalia:library" });
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.action === "marginalia:toggle") {
      enabled ? hide() : show();
    }
  });
  chrome.storage.onChanged.addListener((_, area) => {
    if (area === "local") refresh().catch(() => {});
  });
  let frame;
  window.addEventListener(
    "scroll",
    () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        renderMarkers();
      });
    },
    { passive: true },
  );
  window.addEventListener("resize", renderMarkers);
  // Re-anchor after article reflows and client-side route changes.
  const observer = new MutationObserver((records) => {
    if (
      records.every(
        (r) =>
          r.target === host ||
          host.contains(r.target) ||
          r.target.nodeName === "STYLE",
      )
    )
      return;
    clearTimeout(navigationTimer);
    navigationTimer = setTimeout(() => {
      const next = canonicalUrl(location.href);
      if (next !== address) {
        address = next;
        resetDraft();
      }
      refresh().catch(() => {});
    }, 700);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  refresh().catch(() => {});
}
