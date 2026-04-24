/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const zipIo = moduleRegistry.getModule<{
    unzipEntries: (arrayBuffer: ArrayBuffer) => Promise<Map<string, Uint8Array>>;
  }>("zipIo");
  const documentParser = moduleRegistry.getModule<{
    parseDocumentXml: (documentXmlBytes: Uint8Array, relationshipsBytes?: Uint8Array) => { paragraphs: { kind: "paragraph"; text: string }[] };
  }>("documentParser");

  async function parseDocx(arrayBuffer: ArrayBuffer): Promise<{ paragraphs: { kind: "paragraph"; text: string }[] }> {
    const files = await zipIo?.unzipEntries(arrayBuffer);
    if (!files) {
      throw new Error("ZIP module is not loaded.");
    }
    const documentXmlBytes = files.get("word/document.xml");
    if (!documentXmlBytes) {
      throw new Error("word/document.xml was not found.");
    }
    const relationshipsBytes = files.get("word/_rels/document.xml.rels");
    return documentParser?.parseDocumentXml(documentXmlBytes, relationshipsBytes) || { paragraphs: [] };
  }

  function renderMarkdown(parsedDocument: { paragraphs: { kind: "paragraph"; text: string }[] }): string {
    return parsedDocument.paragraphs
      .map((paragraph) => paragraph.text)
      .join("\n\n");
  }

  moduleRegistry.registerModule("docx2md", {
    parseDocx,
    renderMarkdown
  });
})();
