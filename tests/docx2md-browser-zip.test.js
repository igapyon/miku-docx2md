// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadBrowserZipApi() {
  delete globalThis.__docx2mdModuleRegistry;
  delete globalThis.getDocx2mdModuleRegistry;
  for (const relPath of [
    "src/js/module-registry.js",
    "src/js/browser-zip.js"
  ]) {
    const source = readFileSync(path.resolve(__dirname, "..", relPath), "utf8");
    new Function(source)();
  }
  return globalThis.__docx2mdModuleRegistry.getModule("browserZip");
}

describe("docx2md browser zip", () => {
  it("writes a fixed reproducible ZIP entry timestamp", () => {
    const api = loadBrowserZipApi();
    const zipBytes = api.createStoredZip([
      { name: "manifest.json", data: new TextEncoder().encode("{}") }
    ]);
    const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
    const centralOffset = view.getUint32(zipBytes.length - 22 + 16, true);

    expect(api.fixedZipEntryTimestamp).toEqual({
      dosDate: 23073,
      dosTime: 0
    });
    expect(view.getUint16(10, true)).toBe(api.fixedZipEntryTimestamp.dosTime);
    expect(view.getUint16(12, true)).toBe(api.fixedZipEntryTimestamp.dosDate);
    expect(view.getUint16(centralOffset + 12, true)).toBe(api.fixedZipEntryTimestamp.dosTime);
    expect(view.getUint16(centralOffset + 14, true)).toBe(api.fixedZipEntryTimestamp.dosDate);
  });

  it("keeps stored ZIP output byte-stable for the same entries", () => {
    const api = loadBrowserZipApi();
    const entries = [
      { name: "manifest.json", data: new TextEncoder().encode("{}") },
      { name: "word/media/image.png", data: Uint8Array.from([1, 2, 3]) }
    ];

    expect(Array.from(api.createStoredZip(entries))).toEqual(Array.from(api.createStoredZip(entries)));
  });
});
