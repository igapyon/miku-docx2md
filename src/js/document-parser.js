/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule("xmlUtils");
  const relsParser = moduleRegistry.getModule("relsParser");

  function extractTextRuns(paragraph, relationships) {
    const pieces = [];
    for (const child of Array.from(paragraph.childNodes || [])) {
      if (child.nodeType !== 1) continue;
      if (child.localName === "r") {
        const textElements = xmlUtils.getChildrenByLocalName(child, "t");
        for (const textElement of textElements) {
          pieces.push(xmlUtils.getTextContent(textElement));
        }
        const breakElements = xmlUtils.getChildrenByLocalName(child, "br");
        if (breakElements.length > 0) {
          pieces.push("<br>".repeat(breakElements.length));
        }
      } else if (child.localName === "hyperlink") {
        const linkText = extractTextRuns(child, relationships);
        const relationshipId = child.getAttribute("r:id") || "";
        const anchor = child.getAttribute("w:anchor") || child.getAttribute("anchor") || "";
        if (relationshipId && relationships.has(relationshipId)) {
          pieces.push(`[${linkText}](${relationships.get(relationshipId).target})`);
        } else if (anchor) {
          pieces.push(`[${linkText}](#${anchor})`);
        } else {
          pieces.push(linkText);
        }
      }
    }
    return pieces.join("").replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
  }

  function parseDocumentXml(documentXmlBytes, relationshipsBytes) {
    const document = xmlUtils.parseXml(documentXmlBytes);
    const body = xmlUtils.findDescendantsByLocalName(document, "body")[0] || null;
    const relationships = relationshipsBytes ? relsParser.parseRelationships(relationshipsBytes, "word/document.xml") : new Map();
    const paragraphs = [];
    if (!body) {
      return { paragraphs };
    }
    for (const element of xmlUtils.getChildrenByLocalName(body, "p")) {
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
