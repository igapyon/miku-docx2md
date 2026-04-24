/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    parseXml: (bytes: Uint8Array) => Document;
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
    findDescendantsByLocalName: (parent: ParentNode, localName: string) => Element[];
    getTextContent: (node: Node | null | undefined) => string;
  }>("xmlUtils");
  const relsParser = moduleRegistry.getModule<{
    parseRelationships: (bytes: Uint8Array, sourcePath: string) => Map<string, { target: string; type: string; mode: string }>;
  }>("relsParser");

  type ParsedParagraph = {
    kind: "paragraph";
    text: string;
  };

  type ParsedDocument = {
    paragraphs: ParsedParagraph[];
  };

  function getFirstChildByLocalName(parent: ParentNode, localName: string): Element | null {
    return xmlUtils?.getChildrenByLocalName(parent, localName)[0] || null;
  }

  function extractTextRuns(paragraph: Element, relationships: Map<string, { target: string; type: string; mode: string }>): string {
    const pieces: string[] = [];
    for (const child of Array.from(paragraph.childNodes || [])) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      if (element.localName === "r") {
        const textElements = xmlUtils?.getChildrenByLocalName(element, "t") || [];
        for (const textElement of textElements) {
          pieces.push(xmlUtils?.getTextContent(textElement) || "");
        }
        const breakElements = xmlUtils?.getChildrenByLocalName(element, "br") || [];
        if (breakElements.length > 0) {
          pieces.push("<br>".repeat(breakElements.length));
        }
      } else if (element.localName === "hyperlink") {
        const linkText = extractTextRuns(element, relationships);
        const relationshipId = element.getAttribute("r:id") || "";
        const anchor = element.getAttribute("w:anchor") || element.getAttribute("anchor") || "";
        if (relationshipId && relationships.has(relationshipId)) {
          pieces.push(`[${linkText}](${relationships.get(relationshipId)?.target || ""})`);
        } else if (anchor) {
          pieces.push(`[${linkText}](#${anchor})`);
        } else {
          pieces.push(linkText);
        }
      }
    }
    return pieces.join("").replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
  }

  function parseDocumentXml(documentXmlBytes: Uint8Array, relationshipsBytes?: Uint8Array): ParsedDocument {
    const document = xmlUtils?.parseXml(documentXmlBytes);
    const body = document ? xmlUtils?.findDescendantsByLocalName(document, "body")[0] : null;
    const relationships = relationshipsBytes ? relsParser?.parseRelationships(relationshipsBytes, "word/document.xml") || new Map() : new Map();
    const paragraphs: ParsedParagraph[] = [];
    if (!body) {
      return { paragraphs };
    }
    for (const element of xmlUtils?.getChildrenByLocalName(body, "p") || []) {
      const text = extractTextRuns(element, relationships);
      if (text) {
        paragraphs.push({
          kind: "paragraph",
          text
        });
      }
    }
    return { paragraphs };
  }

  moduleRegistry.registerModule("documentParser", {
    parseDocumentXml
  });
})();
