/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    parseXml: (bytes: Uint8Array) => Document;
    findDescendantsByLocalName: (parent: ParentNode, localName: string) => Element[];
    getTextContent: (node: Node | null | undefined) => string;
    getWordAttributeValue: (element: Element | null | undefined, localName: string, fallback?: string) => string;
  }>("xmlUtils");

  function normalizeCommentText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }

  function parseCommentText(commentElement: Element): string {
    const paragraphs = xmlUtils?.findDescendantsByLocalName(commentElement, "p") || [];
    const parts = paragraphs
      .map((paragraph) => normalizeCommentText(xmlUtils?.getTextContent(paragraph) || ""))
      .filter((text) => text !== "");
    return parts.join("<br><br>");
  }

  function parseComments(commentsBytes?: Uint8Array): Docx2mdParsedComment[] {
    if (!commentsBytes || !xmlUtils) return [];
    const document = xmlUtils.parseXml(commentsBytes);
    const comments = xmlUtils.findDescendantsByLocalName(document, "comment");
    return comments
      .map((commentElement, index) => ({
        id: xmlUtils.getWordAttributeValue(commentElement, "id", String(index)),
        label: `comment-${index + 1}`,
        text: parseCommentText(commentElement)
      }))
      .filter((comment) => comment.id !== "" && comment.text !== "");
  }

  moduleRegistry.registerModule("documentCommentsParser", {
    parseComments
  });
})();
