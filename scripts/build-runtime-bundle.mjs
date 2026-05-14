import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DOCX2MD_CORE_JS_ORDER } from "./lib/docx2md-module-order.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const bundleDir = path.resolve(rootDir, "bundle");
const productName = "miku-docx2md";

async function readText(relPath) {
  return fs.readFile(path.resolve(rootDir, relPath), "utf8");
}

async function createRuntimeSource() {
  const packageJson = JSON.parse(await readText("package.json"));
  const coreSources = [];
  for (const relPath of DOCX2MD_CORE_JS_ORDER) {
    coreSources.push({
      path: relPath,
      source: await readText(relPath)
    });
  }

  return `/*
 * ${productName} runtime bundle
 * Version: ${packageJson.version}
 */
const DOCX2MD_RUNTIME_CORE_SOURCES = ${JSON.stringify(coreSources)};
let cachedApi = null;

export const version = ${JSON.stringify(packageJson.version)};
export const embeddedCorePaths = DOCX2MD_RUNTIME_CORE_SOURCES.map((entry) => entry.path);

export function loadDocx2mdRuntime(options = {}) {
  if (cachedApi && !options.reset) {
    return cachedApi;
  }

  if (options.reset) {
    delete globalThis.__docx2mdModuleRegistry;
    delete globalThis.getDocx2mdModuleRegistry;
  }

  for (const entry of DOCX2MD_RUNTIME_CORE_SOURCES) {
    new Function(entry.source)();
  }

  const api = globalThis.__docx2mdModuleRegistry?.getModule("docx2md");
  if (!api) {
    throw new Error("docx2md runtime API failed to initialize.");
  }

  cachedApi = api;
  return api;
}

export default loadDocx2mdRuntime;
`;
}

async function main() {
  await fs.mkdir(bundleDir, { recursive: true });
  const outputPath = path.resolve(bundleDir, `${productName}-runtime.mjs`);
  await fs.writeFile(outputPath, await createRuntimeSource(), "utf8");
  console.log(`[build:runtime] generated ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
