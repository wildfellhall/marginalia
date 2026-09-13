import DOMPurify from "dompurify";
import JSZip from "jszip";
import { uid } from "./model.mjs";
import { fileStore } from "./storage.mjs";
export const cleanHTML = (html) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "em",
      "strong",
      "b",
      "i",
      "blockquote",
      "ul",
      "ol",
      "li",
      "hr",
      "section",
      "article",
      "div",
      "span",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "sup",
      "sub",
      "pre",
      "code",
      "img",
    ],
    ALLOWED_ATTR: ["alt", "src"],
    ALLOW_DATA_ATTR: false,
  }).replace(/<img\b[^>]*>/gi, (tag) =>
    /src="data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+"/i.test(tag)
      ? tag
      : "",
  );
export async function importDocument(file) {
  if (file.size > 75 * 1024 * 1024)
    throw new Error("Please choose a file smaller than 75 MB.");
  const ext = file.name.split(".").pop().toLowerCase();
  const doc = {
    id: uid(),
    title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
    author: "Your collection",
    createdAt: new Date().toISOString(),
    theme: ["rose", "sage", "lavender", "peach"][Math.floor(Math.random() * 4)],
  };
  if (ext === "pdf") {
    doc.format = "PDF";
    await fileStore("put", doc.id, file);
    return doc;
  }
  if (ext === "epub") {
    const zip = await JSZip.loadAsync(file);
    if (zip.file("META-INF/encryption.xml"))
      throw new Error(
        "This EPUB contains encrypted content. Please use a DRM-free EPUB.",
      );
    const parser = new DOMParser();
    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) throw new Error("This EPUB is missing its container.");
    const container = parser.parseFromString(
      await containerFile.async("string"),
      "application/xml",
    );
    const path = container
      .getElementsByTagName("rootfile")[0]
      ?.getAttribute("full-path");
    const opfFile = path && zip.file(path);
    if (!opfFile) throw new Error("This EPUB has no readable book manifest.");
    const opf = parser.parseFromString(
      await opfFile.async("string"),
      "application/xml",
    );
    doc.title =
      opf.getElementsByTagNameNS("*", "title")[0]?.textContent || doc.title;
    doc.author =
      opf.getElementsByTagNameNS("*", "creator")[0]?.textContent ||
      "Unknown author";
    const base = path.includes("/")
      ? path.slice(0, path.lastIndexOf("/") + 1)
      : "";
    const items = Object.fromEntries(
      [...opf.getElementsByTagNameNS("*", "item")].map((i) => [
        i.getAttribute("id"),
        i.getAttribute("href"),
      ]),
    );
    const sections = [];
    let total = 0;
    const normalize = (p) => {
      const parts = [];
      for (const part of p.split("/")) {
        if (part === "..") parts.pop();
        else if (part && part !== ".") parts.push(part);
      }
      return parts.join("/");
    };
    for (const ref of opf.getElementsByTagNameNS("*", "itemref")) {
      const href = items[ref.getAttribute("idref")];
      if (!href) continue;
      const chapterPath = normalize(
        base + decodeURIComponent(href.split("#")[0]),
      );
      const chapter = zip.file(chapterPath);
      if (!chapter) continue;
      const html = await chapter.async("string");
      total += html.length;
      if (total > 20000000)
        throw new Error(
          "This EPUB is too large to read safely in one session.",
        );
      const parsed = parser.parseFromString(html, "text/html");
      for (const img of parsed.images) {
        const src = img.getAttribute("src") || "";
        if (/^(https?:|data:)/.test(src)) {
          img.remove();
          continue;
        }
        const imagePath = normalize(
          chapterPath.slice(0, chapterPath.lastIndexOf("/") + 1) +
            decodeURIComponent(src),
        );
        const asset = zip.file(imagePath);
        const mime = {
          png: "png",
          jpg: "jpeg",
          jpeg: "jpeg",
          gif: "gif",
          webp: "webp",
        }[imagePath.split(".").pop().toLowerCase()];
        if (asset && mime) {
          const data = await asset.async("base64");
          total += data.length;
          if (total > 20000000)
            throw new Error("This EPUB has too many large images.");
          img.setAttribute("src", `data:image/${mime};base64,${data}`);
        } else img.remove();
      }
      sections.push(`<section>${cleanHTML(parsed.body.innerHTML)}</section>`);
    }
    if (!sections.length)
      throw new Error("No readable chapters were found in this EPUB.");
    doc.html = sections.join("");
    doc.format = "EPUB";
    return doc;
  }
  if (["html", "htm", "txt", "md"].includes(ext)) {
    const raw = await file.text();
    if (ext === "txt" || ext === "md") {
      const el = document.createElement("div");
      el.textContent = raw;
      doc.html = `<p>${el.innerHTML.replace(/\n\s*\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    } else doc.html = cleanHTML(raw);
    doc.format = "Article";
    return doc;
  }
  throw new Error("Choose a PDF, EPUB, HTML, Markdown, or text file.");
}
