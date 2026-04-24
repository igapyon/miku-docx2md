/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const zipIo = moduleRegistry.getModule<{
    unzipEntries: (arrayBuffer: ArrayBuffer) => Promise<Map<string, Uint8Array>>;
  }>("zipIo");

  async function loadDocxPackage(arrayBuffer: ArrayBuffer): Promise<Docx2mdLoadedPackage> {
    const files = await zipIo?.unzipEntries(arrayBuffer);
    if (!files) {
      throw new Error("ZIP module is not loaded.");
    }
    const documentXmlBytes = files.get("word/document.xml");
    if (!documentXmlBytes) {
      throw new Error("word/document.xml was not found.");
    }
    return {
      files,
      documentXmlBytes,
      relationshipsBytes: files.get("word/_rels/document.xml.rels"),
      stylesBytes: files.get("word/styles.xml"),
      numberingBytes: files.get("word/numbering.xml"),
      contentTypesBytes: files.get("[Content_Types].xml")
    };
  }

  moduleRegistry.registerModule("docxPackageLoader", {
    loadDocxPackage
  });
})();
