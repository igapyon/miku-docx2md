/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    parseXml: (bytes: Uint8Array) => Document;
    findDescendantsByLocalName: (parent: ParentNode, localName: string) => Element[];
  }>("xmlUtils");
  const relsParser = moduleRegistry.getModule<{
    parseRelationships: (bytes: Uint8Array, sourcePath: string) => Map<string, Docx2mdRelationship>;
  }>("relsParser");
  const stylesParser = moduleRegistry.getModule<{
    parseStyles: (bytes?: Uint8Array) => Map<string, Docx2mdParsedStyleDefinition>;
  }>("stylesParser");
  const numberingParser = moduleRegistry.getModule<{
    parseNumbering: (bytes?: Uint8Array) => Docx2mdNumberingDefinition;
  }>("numberingParser");
  const documentBlockParser = moduleRegistry.getModule<{
    parseDocumentBody: (
      body: Element | null,
      relationships: Map<string, Docx2mdRelationship>,
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      numbering: Docx2mdNumberingDefinition
    ) => Docx2mdParsedDocument;
  }>("documentBlockParser");
  const documentSummary = moduleRegistry.getModule<{
    createEmptyParsedDocument: () => Docx2mdParsedDocument;
  }>("documentSummary");

  function requireDocumentSummary() {
    if (!documentSummary) {
      throw new Error("DOCX document summary module is not loaded.");
    }
    return documentSummary;
  }

  function parseDocumentXml(
    documentXmlBytes: Uint8Array,
    relationshipsBytes?: Uint8Array,
    stylesBytes?: Uint8Array,
    numberingBytes?: Uint8Array
  ): Docx2mdParsedDocument {
    const document = xmlUtils?.parseXml(documentXmlBytes);
    const body = document ? xmlUtils?.findDescendantsByLocalName(document, "body")[0] || null : null;
    const relationships = relationshipsBytes ? relsParser?.parseRelationships(relationshipsBytes, "word/document.xml") || new Map() : new Map();
    const styles = stylesParser?.parseStyles(stylesBytes) || new Map();
    const numbering = numberingParser?.parseNumbering(numberingBytes) || { abstractNums: new Map(), nums: new Map() };
    return documentBlockParser?.parseDocumentBody(body, relationships, styles, numbering)
      || requireDocumentSummary().createEmptyParsedDocument();
  }

  moduleRegistry.registerModule("documentParser", {
    parseDocumentXml
  });
})();
