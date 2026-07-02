// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";

import { loadDocx2mdNodeApi } from "../scripts/lib/docx2md-node-runtime.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const textDecoder = new TextDecoder("utf-8");

const fixtureNames = [
  "word-bullet-list-basic.docx",
  "word-headings-basic.docx",
  "word-image-alt-text-basic.docx",
  "word-inline-formatting-basic.docx",
  "word-inline-image-basic.docx",
  "word-links-basic.docx",
  "word-nested-list-basic.docx",
  "word-numbered-list-basic.docx",
  "word-reviewing-comments-basic.docx",
  "word-reviewing-tracked-changes-basic.docx",
  "word-table-merged-cell-basic.docx"
];

const intentionallyExternalRelationships = new Map([
  ["word-links-basic.docx", new Set(["https://example.com/"])]
]);

const intentionallyCommentedFixtures = new Set([
  "word-reviewing-comments-basic.docx"
]);

async function unzipFixture(fileName) {
  loadDocx2mdNodeApi();
  const zipIo = globalThis.__docx2mdModuleRegistry?.getModule("zipIo");
  if (!zipIo) {
    throw new Error("zipIo module failed to initialize.");
  }
  const bytes = readFileSync(path.resolve(__dirname, "fixtures", "docx", fileName));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return zipIo.unzipEntries(arrayBuffer);
}

function decodeEntry(entries, entryName) {
  const bytes = entries.get(entryName);
  if (!bytes) {
    throw new Error(`Missing DOCX entry: ${entryName}`);
  }
  return textDecoder.decode(bytes);
}

function textContent(xmlText, tagName) {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  const node = document.getElementsByTagName(tagName)[0];
  return node?.textContent ?? null;
}

function relationshipRecords(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  return Array.from(document.getElementsByTagName("Relationship")).map((node) => ({
    id: node.getAttribute("Id") || "",
    target: node.getAttribute("Target") || "",
    targetMode: node.getAttribute("TargetMode") || ""
  }));
}

function commentRecords(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  return Array.from(document.getElementsByTagName("w:comment"));
}

describe("docx fixture hygiene", () => {
  it("keeps Word fixture metadata scrubbed and stable", async () => {
    for (const fixtureName of fixtureNames) {
      const entries = await unzipFixture(fixtureName);
      const coreXml = decodeEntry(entries, "docProps/core.xml");
      const appXml = decodeEntry(entries, "docProps/app.xml");

      expect(textContent(coreXml, "dc:creator"), fixtureName).toBe(null);
      expect(textContent(coreXml, "cp:lastModifiedBy"), fixtureName).toBe(null);
      expect(textContent(coreXml, "dcterms:created"), fixtureName).toBe(null);
      expect(textContent(coreXml, "dcterms:modified"), fixtureName).toBe(null);
      expect(textContent(appXml, "Application"), fixtureName).toBe("Microsoft Office Word");
      expect(textContent(appXml, "AppVersion"), fixtureName).toBe("16.0000");
    }
  });

  it("rejects undocumented comments, embedded objects, macros, and external relationships", async () => {
    for (const fixtureName of fixtureNames) {
      const entries = await unzipFixture(fixtureName);
      const entryNames = Array.from(entries.keys());

      if (intentionallyCommentedFixtures.has(fixtureName)) {
        expect(entryNames, fixtureName).toContain("word/comments.xml");
        for (const comment of commentRecords(decodeEntry(entries, "word/comments.xml"))) {
          expect(comment.getAttribute("w:author"), fixtureName).toBe(null);
          expect(comment.getAttribute("w:date"), fixtureName).toBe(null);
          expect(comment.getAttribute("w:initials"), fixtureName).toBe(null);
        }
      } else {
        expect(entryNames, fixtureName).not.toContain("word/comments.xml");
      }
      expect(entryNames.some((entryName) => entryName.startsWith("word/embeddings/")), fixtureName).toBe(false);
      expect(entryNames, fixtureName).not.toContain("word/vbaProject.bin");

      const allowedExternalTargets = intentionallyExternalRelationships.get(fixtureName) ?? new Set();
      for (const entryName of entryNames.filter((name) => name.endsWith(".rels"))) {
        const relsXml = decodeEntry(entries, entryName);
        for (const relationship of relationshipRecords(relsXml)) {
          if (relationship.targetMode !== "External") continue;
          expect(allowedExternalTargets.has(relationship.target), `${fixtureName}: ${entryName} ${relationship.id}`).toBe(true);
        }
      }
    }
  });
});
