/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    findDescendantsByLocalName: (parent: ParentNode, localName: string) => Element[];
    getAttributeValue: (element: Element | null | undefined, name: string, fallback?: string) => string;
    getNamespacedAttributeValue: (element: Element | null | undefined, namespacePrefix: string, localName: string, fallback?: string) => string;
  }>("xmlUtils");

  function classifyUnsupportedType(localName: string): string {
    switch (localName) {
      case "drawing":
      case "pict":
      case "object":
        return "drawing";
      case "txbxContent":
      case "textbox":
      case "textBox":
        return "textbox";
      case "chart":
        return "chart";
      default:
        return localName || "unknown";
    }
  }

  function resolveImageTargetFromUnsupportedElement(
    element: Element,
    relationships: Map<string, Docx2mdRelationship>
  ): string {
    const blips = xmlUtils?.findDescendantsByLocalName(element, "blip") || [];
    for (const blip of blips) {
      const relationshipId = xmlUtils?.getNamespacedAttributeValue(blip, "r", "embed") || "";
      if (!relationshipId) continue;
      const relationship = relationships.get(relationshipId);
      if (!relationship) continue;
      if (relationship.type.includes("/image")) {
        return relationship.target;
      }
    }
    return "";
  }

  function readTrimmedAttribute(element: Element, name: string): string {
    return (xmlUtils?.getAttributeValue(element, name) || "").trim();
  }

  function resolveImageAltTextFromUnsupportedElement(element: Element): string {
    const metadataElements = [
      ...(xmlUtils?.findDescendantsByLocalName(element, "docPr") || []),
      ...(xmlUtils?.findDescendantsByLocalName(element, "cNvPr") || [])
    ];
    for (const metadataElement of metadataElements) {
      const description = readTrimmedAttribute(metadataElement, "descr");
      if (description) return description;
      const title = readTrimmedAttribute(metadataElement, "title");
      if (title) return title;
    }
    return "";
  }

  function resolveImageExtentFromUnsupportedElement(element: Element): string {
    const extentElements = xmlUtils?.findDescendantsByLocalName(element, "extent") || [];
    for (const extentElement of extentElements) {
      const cx = readTrimmedAttribute(extentElement, "cx");
      const cy = readTrimmedAttribute(extentElement, "cy");
      if (cx && cy) {
        return `${cx}x${cy}`;
      }
    }
    return "";
  }

  function formatDrawingImageTrace(imageTarget: string, imageAltText: string, imageExtent: string): string {
    const parts = [`drawing:image(${imageTarget})`];
    if (imageAltText) {
      parts.push(`alt(${imageAltText})`);
    }
    if (imageExtent) {
      parts.push(`size-emu(${imageExtent})`);
    }
    return parts.join(":");
  }

  function describeUnsupportedElement(
    element: Element,
    relationships: Map<string, Docx2mdRelationship>
  ): string {
    const type = classifyUnsupportedType(element.localName || "unknown");
    if (type === "drawing") {
      const imageTarget = resolveImageTargetFromUnsupportedElement(element, relationships);
      const imageAltText = resolveImageAltTextFromUnsupportedElement(element);
      const imageExtent = resolveImageExtentFromUnsupportedElement(element);
      if (imageTarget) {
        return formatDrawingImageTrace(imageTarget, imageAltText, imageExtent);
      }
    }
    return type;
  }

  moduleRegistry.registerModule("documentDrawingParser", {
    describeUnsupportedElement
  });
})();
