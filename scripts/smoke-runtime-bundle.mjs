import { Blob as NodeBlob } from "node:buffer";
import { readFile } from "node:fs/promises";
import { DecompressionStream as NodeDecompressionStream } from "node:stream/web";

import {
  DOMParser as XmldomParser,
  XMLSerializer as XmldomSerializer,
  Node as XmldomNode,
  Document as XmldomDocument,
  Element as XmldomElement
} from "@xmldom/xmldom";

import { loadDocx2mdRuntime, version } from "../bundle/miku-docx2md-runtime.mjs";

function installNodeDomGlobals() {
  globalThis.DOMParser ??= XmldomParser;
  globalThis.Node ??= XmldomNode;
  globalThis.Document ??= XmldomDocument;
  globalThis.Element ??= XmldomElement;
  globalThis.XMLSerializer ??= XmldomSerializer;
  globalThis.Blob ??= NodeBlob;
  globalThis.DecompressionStream ??= NodeDecompressionStream;
}

async function main() {
  installNodeDomGlobals();

  if (!version) {
    throw new Error("Runtime bundle did not export a version.");
  }

  const api = loadDocx2mdRuntime({ reset: true });
  if (typeof api.parseDocx !== "function" || typeof api.renderMarkdown !== "function") {
    throw new Error("Runtime bundle did not expose the expected docx2md API.");
  }

  const fixtureBytes = await readFile("tests/fixtures/docx/word-headings-basic.docx");
  const parsed = await api.parseDocx(
    fixtureBytes.buffer.slice(fixtureBytes.byteOffset, fixtureBytes.byteOffset + fixtureBytes.byteLength)
  );
  const markdown = api.renderMarkdown(parsed);
  if (!markdown.includes("# Heading 1") || !markdown.includes("###### Heading 6")) {
    throw new Error("Runtime bundle conversion smoke output did not include expected headings.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
