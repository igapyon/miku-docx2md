/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const zipIo = moduleRegistry.getModule("zipIo");
  const documentParser = moduleRegistry.getModule("documentParser");

  async function parseDocx(arrayBuffer) {
    const files = await zipIo.unzipEntries(arrayBuffer);
    const documentXmlBytes = files.get("word/document.xml");
    if (!documentXmlBytes) {
      throw new Error("word/document.xml was not found.");
    }
    const relationshipsBytes = files.get("word/_rels/document.xml.rels");
    return documentParser.parseDocumentXml(documentXmlBytes, relationshipsBytes);
  }

  function renderMarkdown(parsedDocument) {
    return parsedDocument.paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  }

  moduleRegistry.registerModule("docx2md", {
    parseDocx,
    renderMarkdown
  });
})();
