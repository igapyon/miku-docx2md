import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { DOCX2MD_CORE_JS_ORDER } from "./lib/docx2md-module-order.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const bundleDir = path.resolve(rootDir, "bundle");
const tempDir = path.resolve(bundleDir, ".tmp");
const productName = "miku-docx2md";

async function readText(relPath) {
  return fs.readFile(path.resolve(rootDir, relPath), "utf8");
}

async function createBundleEntry() {
  const packageJson = JSON.parse(await readText("package.json"));
  const coreSources = [];
  for (const relPath of DOCX2MD_CORE_JS_ORDER) {
    coreSources.push({
      path: relPath,
      source: await readText(relPath)
    });
  }

  const cliSource = (await readText("scripts/miku-docx2md-cli.mjs"))
    .replace('import { loadDocx2mdNodeApi } from "./lib/docx2md-node-runtime.mjs";\n\n', "")
    .replace(
      /async function readPackageVersion\(\) \{[\s\S]*?\n\}/,
      `async function readPackageVersion() {\n  return ${JSON.stringify(packageJson.version)};\n}`
    );

  return `import { Blob as NodeBlob } from "node:buffer";
import { createRequire } from "node:module";
import { DecompressionStream as NodeDecompressionStream } from "node:stream/web";
import {
  DOMParser as XmldomParser,
  XMLSerializer as XmldomSerializer,
  Node as XmldomNode,
  Document as XmldomDocument,
  Element as XmldomElement
} from "@xmldom/xmldom";

const nodeRequire = createRequire(import.meta.url);
const DOCX2MD_EMBEDDED_CORE_SOURCES = ${JSON.stringify(coreSources)};
let cachedApi = null;

function installNodeDomGlobals() {
  if (typeof globalThis.DOMParser !== "function") {
    globalThis.DOMParser = XmldomParser;
    globalThis.Node = XmldomNode;
    globalThis.Document = XmldomDocument;
    globalThis.Element = XmldomElement;
    globalThis.XMLSerializer ??= XmldomSerializer;
  }
  if (typeof globalThis.Blob === "undefined" || typeof globalThis.Blob.prototype?.stream !== "function") {
    globalThis.Blob = NodeBlob;
  }
  globalThis.DecompressionStream ??= NodeDecompressionStream;
  globalThis.__docx2mdNodeRequire ??= nodeRequire;
}

function loadDocx2mdNodeApi() {
  if (cachedApi) return cachedApi;
  installNodeDomGlobals();
  delete globalThis.__docx2mdModuleRegistry;
  delete globalThis.getDocx2mdModuleRegistry;
  for (const entry of DOCX2MD_EMBEDDED_CORE_SOURCES) {
    new Function(entry.source)();
  }
  const api = globalThis.__docx2mdModuleRegistry?.getModule("docx2md");
  if (!api) {
    throw new Error("docx2md core API failed to initialize.");
  }
  cachedApi = api;
  return api;
}

${cliSource}`;
}

async function main() {
  await fs.mkdir(tempDir, { recursive: true });
  const entryPath = path.resolve(tempDir, "miku-docx2md-bundle-entry.mjs");
  const outputPath = path.resolve(bundleDir, `${productName}.mjs`);
  const sourcesPath = path.resolve(bundleDir, `${productName}-sources.tgz`);
  await fs.writeFile(entryPath, await createBundleEntry(), "utf8");

  await execFileAsync(
    path.resolve(rootDir, "node_modules/.bin/esbuild"),
    [
      entryPath,
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--target=node20",
      "--outfile=" + outputPath,
      "--banner:js=#!/usr/bin/env node"
    ],
    { cwd: rootDir }
  );
  await fs.chmod(outputPath, 0o755);

  await execFileAsync(
    "git",
    [
      "archive",
      "--format=tar.gz",
      `--prefix=${productName}-sources/`,
      "-o",
      sourcesPath,
      "HEAD"
    ],
    { cwd: rootDir }
  );

  await fs.rm(tempDir, { recursive: true, force: true });
  console.log(`[build:bundle] generated ${path.relative(rootDir, outputPath)}`);
  console.log(`[build:bundle] generated ${path.relative(rootDir, sourcesPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
