import { resolveAnchor } from "./model.mjs";
export function textNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest(
        "script,style,noscript,textarea,input,[data-marginalia-ui]",
      )
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}
export function captureAnchor(root, range) {
  const nodes = textNodes(root);
  // Selections may end at element boundaries (whole paragraphs, Select All),
  // not just inside text nodes. Count only the eligible text before each point.
  const offsetAt = (container, position) => {
    if (!root.contains(container)) return null;
    const boundary = document.createRange();
    boundary.setStart(container, position);
    boundary.collapse(true);
    let offset = 0;
    for (const node of nodes) {
      if (node === container) return offset + position;
      if (boundary.comparePoint(node, 0) >= 0) return offset;
      offset += node.textContent.length;
    }
    return offset;
  };
  const start = offsetAt(range.startContainer, range.startOffset);
  const end = offsetAt(range.endContainer, range.endOffset);
  if (start === null || end === null || end <= start) return null;
  const text = nodes.map((n) => n.textContent).join("");
  return {
    start,
    end,
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - 40), start),
    suffix: text.slice(end, end + 40),
  };
}
export function anchorRange(root, anchor) {
  const nodes = textNodes(root),
    text = nodes.map((n) => n.textContent).join("");
  const found = resolveAnchor(text, anchor);
  if (!found) return null;
  const range = document.createRange();
  let offset = 0,
    begun = false;
  for (const node of nodes) {
    const end = offset + node.textContent.length;
    if (!begun && found.start < end) {
      range.setStart(node, found.start - offset);
      begun = true;
    }
    if (begun && found.end <= end) {
      range.setEnd(node, found.end - offset);
      return range;
    }
    offset = end;
  }
  return null;
}
export function paintAnnotations(root, annotations, namespace = "marginalia") {
  if (!globalThis.CSS?.highlights || !globalThis.Highlight) return () => {};
  const names = [],
    rules = [];
  for (const a of annotations) {
    if (!a.anchor) continue;
    const range = anchorRange(root, a.anchor);
    if (!range) continue;
    const name = `${namespace}-${a.id.replace(/[^a-zA-Z0-9-]/g, "")}`;
    CSS.highlights.set(name, new Highlight(range));
    names.push(name);
    rules.push(
      `::highlight(${name}) { ${a.type === "underline" ? `text-decoration: underline ${a.color} 2px;` : `background-color: ${/^#[0-9a-f]{6}$/i.test(a.color) ? a.color : "#f2dfa0"}99;`} color: inherit; }`,
    );
  }
  const style = document.createElement("style");
  style.dataset.marginaliaUi = "";
  style.textContent = rules.join("\n");
  document.head.append(style);
  return () => {
    names.forEach((n) => CSS.highlights.delete(n));
    style.remove();
  };
}
