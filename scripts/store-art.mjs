import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("public/icons", { recursive: true });
await mkdir("store/assets", { recursive: true });
const svg = await readFile("store/assets/icon.svg");
for (const size of [16, 32, 48, 128]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
}
await sharp(svg).png().toFile("store/assets/store-icon-128.png");
const book = `<g fill="none" stroke="#6c7b60" stroke-width="2" stroke-linejoin="round"><path d="M0 23c26-9 55-3 76 8 22-15 49-22 78-14l-5 76c-27-6-53 1-73 14C48 95 25 91-3 97Z" fill="#fbf7eb"/><path d="M76 31v76M12 40c20-4 38 0 50 5M12 53c18-3 33 1 50 7M12 68c18-3 33 1 50 7M90 43c17-9 32-11 49-9M90 58c17-9 32-11 49-9M90 73c17-9 32-11 49-9" stroke="#c4c6b6"/><path d="M121 22v46l9-7 9 4V19" fill="#d8c9e1" stroke="#b7a6bf"/></g>`;
const small = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280"><rect width="440" height="280" fill="#e8e4ed"/><rect x="12" y="12" width="416" height="256" rx="5" fill="none" stroke="#c9c1d0"/><text x="30" y="54" font-family="Georgia,serif" font-size="26" fill="#536448">marginalia.</text><text x="30" y="99" font-family="Georgia,serif" font-size="22" fill="#6f6379">Your readings</text><text x="30" y="130" font-family="Georgia,serif" font-style="italic" font-size="22" fill="#6f6379">and notes.</text><g transform="translate(262 132) rotate(-8) scale(.88)">${book}</g><text x="30" y="185" font-family="Georgia,serif" font-size="13" fill="#737b67">Study notes &amp; highlights</text><text x="30" y="211" font-family="Georgia,serif" font-size="11" fill="#858976">Websites · PDFs · EPUBs</text><text x="30" y="246" font-family="Georgia,serif" font-size="10" fill="#7a866b">Saved on your device. No account needed.</text></svg>`;
await sharp(Buffer.from(small))
  .flatten({ background: "#e8e4ed" })
  .png()
  .toFile("store/assets/promo-440x280.png");
const marquee = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560"><rect width="1400" height="560" fill="#e8e4ed"/><rect x="24" y="24" width="1352" height="512" rx="8" fill="none" stroke="#c9c1d0"/><text x="90" y="105" font-family="Georgia,serif" font-size="43" fill="#536448">marginalia.</text><text x="90" y="225" font-family="Georgia,serif" font-size="57" fill="#6f6379">Your readings</text><text x="90" y="303" font-family="Georgia,serif" font-style="italic" font-size="57" fill="#6f6379">and notes.</text><text x="93" y="375" font-family="Georgia,serif" font-size="23" fill="#737b67">Annotate sources. Organize notes by course.</text><text x="93" y="425" font-family="Georgia,serif" font-size="18" fill="#858976">Websites · PDFs · EPUBs · Saved on your device</text><g transform="translate(930 210) rotate(-8) scale(2.1)">${book}</g></svg>`;
await sharp(Buffer.from(marquee))
  .flatten({ background: "#e8e4ed" })
  .png()
  .toFile("store/assets/marquee-1400x560.png");
console.log(
  "Generated extension icons, store icon, small promo tile, and optional marquee.",
);
