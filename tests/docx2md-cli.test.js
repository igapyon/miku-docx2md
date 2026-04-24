// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createStoredZip(entries) {
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, 0, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localChunks.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, 0, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralChunks.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectoryOffset = offset;
  let centralDirectorySize = 0;
  for (const chunk of centralChunks) {
    centralDirectorySize += chunk.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralDirectorySize, true);
  eocdView.setUint32(16, centralDirectoryOffset, true);
  eocdView.setUint16(20, 0, true);

  const totalLength = localChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    + centralChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    + eocd.length;
  const out = new Uint8Array(totalLength);
  let cursor = 0;
  for (const chunk of localChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  for (const chunk of centralChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  out.set(eocd, cursor);
  return out;
}

function createCliDocxBytes() {
  const encoder = new TextEncoder();
  return createStoredZip([
    {
      name: "word/document.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello CLI</w:t></w:r></w:p>
    <w:drawing/>
  </w:body>
</w:document>`
      )
    }
  ]);
}

describe("docx2md cli", () => {
  it("writes markdown and can include debug comments and summary", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "docx2md-cli-"));
    try {
      const inputPath = path.join(tempDir, "sample.docx");
      const outputPath = path.join(tempDir, "sample.md");
      const summaryPath = path.join(tempDir, "sample.summary.txt");
      writeFileSync(inputPath, createCliDocxBytes());

      const summaryOutput = execFileSync(
        process.execPath,
        [
          "scripts/miku-docx2md-cli.mjs",
          inputPath,
          "--out",
          outputPath,
          "--summary-out",
          summaryPath,
          "--summary",
          "--debug"
        ],
        {
          cwd: path.resolve(__dirname, ".."),
          encoding: "utf8"
        }
      );

      const markdown = readFileSync(outputPath, "utf8");
      const summaryText = readFileSync(summaryPath, "utf8");
      expect(markdown).toContain("Hello CLI");
      expect(markdown).toContain("<!-- unsupported: drawing -->");
      expect(summaryOutput).toContain("paragraphs: 1");
      expect(summaryOutput).toContain("unsupportedElements: 1");
      expect(summaryText).toContain("paragraphs: 1");
      expect(summaryText).toContain("unsupportedCommentTraces: 1");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
