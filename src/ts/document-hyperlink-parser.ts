/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getWordAttributeValue: (element: Element | null | undefined, localName: string, fallback?: string) => string;
    getNamespacedAttributeValue: (element: Element | null | undefined, namespacePrefix: string, localName: string, fallback?: string) => string;
  }>("xmlUtils");
  const documentAnchorParser = moduleRegistry.getModule<{
    normalizeAnchorName: (name: string) => string;
    normalizeRelationshipAnchorTarget: (target: string) => string;
  }>("documentAnchorParser");

  function normalizeAnchorName(name: string): string {
    return documentAnchorParser?.normalizeAnchorName(name) || "";
  }

  function normalizeRelationshipAnchorTarget(target: string): string {
    return documentAnchorParser?.normalizeRelationshipAnchorTarget(target) || "";
  }

  function renderHyperlink(
    hyperlinkElement: Element,
    linkText: string,
    relationships: Map<string, Docx2mdRelationship>,
    context: Docx2mdParseContext
  ): string {
    const relationshipId = xmlUtils?.getNamespacedAttributeValue(hyperlinkElement, "r", "id") || "";
    const anchor = normalizeAnchorName(xmlUtils?.getWordAttributeValue(hyperlinkElement, "anchor") || "");
    const relationship = relationshipId ? relationships.get(relationshipId) || null : null;
    const relationshipAnchor = relationship ? normalizeRelationshipAnchorTarget(relationship.target) : "";
    if (relationship?.mode === "External") {
      context.summary.links += 1;
      context.summary.externalLinks += 1;
      return `[${linkText}](${relationship.target})`;
    }
    if (relationshipAnchor && context.knownAnchorIds.has(relationshipAnchor)) {
      context.summary.links += 1;
      context.summary.internalLinks += 1;
      return `[${linkText}](#${relationshipAnchor})`;
    }
    if (anchor && context.knownAnchorIds.has(anchor)) {
      context.summary.links += 1;
      context.summary.internalLinks += 1;
      return `[${linkText}](#${anchor})`;
    }
    return linkText;
  }

  moduleRegistry.registerModule("documentHyperlinkParser", {
    renderHyperlink
  });
})();
