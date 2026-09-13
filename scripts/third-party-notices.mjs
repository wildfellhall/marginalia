import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const sections = [
  "MARGINALIA — THIRD-PARTY NOTICES\n\nThis file preserves license information for installed production dependencies. Some optional packages listed here are not used by the browser bundle. Marginalia's original application code is not licensed by this notice.",
];
for (const [directory, entry] of Object.entries(lock.packages).sort()) {
  if (!directory || entry.dev) continue;
  let pkg;
  try {
    pkg = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  } catch {
    continue;
  }
  const files = (await readdir(directory)).filter((name) =>
    /^(licen[cs]e|copying|ofl|notice)(\.|$|-)/i.test(name),
  );
  const texts = [];
  for (const file of files) {
    try {
      texts.push(
        `--- ${file} ---\n${await readFile(join(directory, file), "utf8")}`,
      );
    } catch {
      /* Ignore directories. */
    }
  }
  sections.push(
    `${pkg.name} ${pkg.version}\nLicense: ${typeof pkg.license === "string" ? pkg.license : JSON.stringify(pkg.license || entry.license || "See upstream package")}\nSource: ${typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url || pkg.homepage || "https://www.npmjs.com/package/" + pkg.name}\n\n${texts.join("\n\n")}`,
  );
}
sections.push(
  "Sample reading: Pride and Prejudice by Jane Austen and The Secret Garden by Frances Hodgson Burnett are public-domain excerpts in the United States. The introductory reading article and store demonstration page were written for Marginalia. Sample cover artwork and the store icon are original vector illustrations. Availability of public-domain texts can vary by jurisdiction; select appropriate distribution regions.",
);
await writeFile(
  "dist/THIRD_PARTY_NOTICES.txt",
  sections.join("\n\n" + "=".repeat(72) + "\n\n"),
);
