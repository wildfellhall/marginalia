import { cp, mkdir } from "node:fs/promises";

// Bundle font maps, standard fonts, color profiles, and image decoders so the
// PDF reader also handles non-Latin text and complex images without a CDN.
await mkdir("public/pdfjs", { recursive: true });
for (const directory of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(
    `node_modules/pdfjs-dist/${directory}`,
    `public/pdfjs/${directory}`,
    {
      recursive: true,
    },
  );
}
