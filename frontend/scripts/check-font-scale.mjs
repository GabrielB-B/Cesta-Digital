import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const pagesDirectory = path.resolve("src/pages");
const minimumRem = 0.75;
const minimumPx = 12;
const violations = [];

async function collectCssModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectCssModules(entryPath);
      }
      return entry.name.endsWith(".module.css") ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

for (const filePath of await collectCssModules(pagesDirectory)) {
  const source = await readFile(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const declarations = line.matchAll(/font-size:\s*([0-9]*\.?[0-9]+)(rem|px)/g);
    for (const declaration of declarations) {
      const value = Number.parseFloat(declaration[1]);
      const unit = declaration[2];
      const belowFloor = unit === "rem" ? value < minimumRem : value < minimumPx;
      if (belowFloor) {
        violations.push({
          file: path.relative(process.cwd(), filePath),
          line: index + 1,
          value: `${value}${unit}`,
        });
      }
    }
  });
}

if (violations.length) {
  process.stderr.write("Textos abaixo do piso tipográfico de 12 px nas páginas V2:\n");
  for (const violation of violations) {
    process.stderr.write(
      `- ${violation.file}:${violation.line} (${violation.value})\n`,
    );
  }
  process.exitCode = 1;
} else {
  process.stdout.write("Escala tipográfica V2 aprovada: nenhuma página abaixo de 12 px.\n");
}
