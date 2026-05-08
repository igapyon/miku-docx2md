// @vitest-environment node

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { TextDecoder, TextEncoder } from "node:util";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { DOCX2MD_APP_TS_ORDER, DOCX2MD_CORE_JS_ORDER } from "../scripts/lib/docx2md-module-order.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const nodeRequire = createRequire(import.meta.url);

const browserScriptOrder = [
  "lht-cmn/js/components.js",
  ...DOCX2MD_CORE_JS_ORDER,
  ...DOCX2MD_APP_TS_ORDER
    .map((relPath) => relPath.replace(/^src\/ts\//, "src/js/").replace(/\.ts$/, ".js"))
    .filter((relPath) => !DOCX2MD_CORE_JS_ORDER.includes(relPath))
];

const validationFixtures = [
  "word-bullet-list-basic.docx",
  "word-headings-basic.docx",
  "word-image-alt-text-basic.docx",
  "word-inline-formatting-basic.docx",
  "word-inline-image-basic.docx",
  "word-links-basic.docx",
  "word-nested-list-basic.docx",
  "word-numbered-list-basic.docx",
  "word-table-merged-cell-basic.docx"
];

function readFixtureBytes(fileName) {
  return readFileSync(path.resolve(__dirname, "fixtures", "docx", fileName));
}

function installBrowserGlobals(window) {
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
  window.DecompressionStream = globalThis.DecompressionStream;
  window.Response = globalThis.Response;
  window.__docx2mdNodeRequire = nodeRequire;
  window.URL.createObjectURL = () => "blob:docx2md-test";
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = () => {};
}

async function createBrowserUi() {
  const html = readFileSync(path.resolve(rootDir, "miku-docx2md-src.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "https://example.test/miku-docx2md.html",
    pretendToBeVisual: true,
    runScripts: "outside-only"
  });
  installBrowserGlobals(dom.window);

  for (const relPath of browserScriptOrder) {
    const source = readFileSync(path.resolve(rootDir, relPath), "utf8");
    dom.window.eval(source);
  }
  dom.window.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  await waitFor(() => dom.window.document.getElementById("statusText")?.textContent === "Select a .docx file to convert.");
  return dom;
}

function createDocxFile(window, fileName) {
  const bytes = readFixtureBytes(fileName);
  const file = new window.File([bytes], fileName, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  if (typeof file.arrayBuffer !== "function") {
    file.arrayBuffer = async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  return file;
}

async function selectFixture(dom, fileName) {
  const { window } = dom;
  const selector = window.document.getElementById("docxFileSelect");
  selector.dispatchEvent(new window.CustomEvent("lht-file-select:change", {
    bubbles: true,
    detail: {
      files: [createDocxFile(window, fileName)],
      names: [fileName]
    }
  }));
  await waitFor(() => window.document.getElementById("statusText")?.textContent === `Converted ${fileName}`);
}

function getPreviewText(dom, id) {
  return dom.window.document.getElementById(id).getText();
}

async function waitFor(predicate) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for browser UI state.");
}

describe("docx2md browser UI", () => {
  it("converts the committed validation fixtures through the Web UI path", async () => {
    const dom = await createBrowserUi();
    try {
      for (const fixtureName of validationFixtures) {
        await selectFixture(dom, fixtureName);

        expect(getPreviewText(dom, "markdownPreview")).not.toBe("");
        expect(getPreviewText(dom, "markdownPreview")).not.toBe("Markdown will appear here.");
        expect(getPreviewText(dom, "summaryPreview")).toContain("paragraphs:");
        expect(dom.window.document.getElementById("downloadBtn").disabled).toBe(false);
        expect(dom.window.document.getElementById("downloadSummaryBtn").disabled).toBe(false);
      }
    } finally {
      dom.window.close();
    }
  });

  it("updates image links, folder changes, and download button states", async () => {
    const dom = await createBrowserUi();
    const { document, Event } = dom.window;
    try {
      await selectFixture(dom, "word-image-alt-text-basic.docx");

      expect(getPreviewText(dom, "markdownPreview")).toContain(
        "![Sample alt text for fixture](word-image-alt-text-basic.assets/word/media/image1.jpeg)"
      );
      expect(document.getElementById("downloadAssetsBtn").disabled).toBe(false);

      const imageLinkFolder = document.getElementById("imageLinkFolder");
      imageLinkFolder.value = "custom.assets";
      imageLinkFolder.dispatchEvent(new Event("input", { bubbles: true }));
      expect(getPreviewText(dom, "markdownPreview")).toContain(
        "![Sample alt text for fixture](custom.assets/word/media/image1.jpeg)"
      );

      const imageLinksEnabled = document.getElementById("imageLinksEnabled");
      imageLinksEnabled.checked = false;
      imageLinksEnabled.dispatchEvent(new Event("change", { bubbles: true }));
      expect(imageLinkFolder.disabled).toBe(true);
      expect(getPreviewText(dom, "markdownPreview")).toContain("[Image: Sample alt text for fixture]");

      document.getElementById("clearBtn").click();
      expect(document.getElementById("downloadBtn").disabled).toBe(true);
      expect(document.getElementById("downloadSummaryBtn").disabled).toBe(true);
      expect(document.getElementById("downloadAssetsBtn").disabled).toBe(true);
    } finally {
      dom.window.close();
    }
  });
});
