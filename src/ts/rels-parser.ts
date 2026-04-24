/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    parseXml: (bytes: Uint8Array) => Document;
    findDescendantsByLocalName: (parent: ParentNode, localName: string) => Element[];
    getAttributeValue: (element: Element | null | undefined, name: string, fallback?: string) => string;
  }>("xmlUtils");

  function resolveZipPath(sourcePath: string, target: string): string {
    if (!target) return target;
    if (target.startsWith("#")) return target;
    if (target.startsWith("/")) {
      return target.replace(/^\/+/, "");
    }
    const baseParts = sourcePath.split("/").slice(0, -1);
    for (const part of target.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") {
        baseParts.pop();
      } else {
        baseParts.push(part);
      }
    }
    return baseParts.join("/");
  }

  function parseRelationshipElement(element: Element, sourcePath: string): {
    id: string;
    relationship: Docx2mdRelationship;
  } {
    const id = xmlUtils?.getAttributeValue(element, "Id") || "";
    const rawTarget = xmlUtils?.getAttributeValue(element, "Target") || "";
    const type = xmlUtils?.getAttributeValue(element, "Type") || "";
    const mode = xmlUtils?.getAttributeValue(element, "TargetMode") || "";
    return {
      id,
      relationship: {
        target: mode === "External" ? rawTarget : resolveZipPath(sourcePath, rawTarget),
        type,
        mode
      }
    };
  }

  function parseRelationships(bytes: Uint8Array, sourcePath: string): Map<string, Docx2mdRelationship> {
    const document = xmlUtils?.parseXml(bytes);
    const relationshipElements = document ? xmlUtils?.findDescendantsByLocalName(document, "Relationship") || [] : [];
    const map = new Map<string, Docx2mdRelationship>();
    for (const element of relationshipElements) {
      const parsedRelationship = parseRelationshipElement(element, sourcePath);
      map.set(parsedRelationship.id, parsedRelationship.relationship);
    }
    return map;
  }

  moduleRegistry.registerModule("relsParser", {
    resolveZipPath,
    parseRelationships
  });
})();
