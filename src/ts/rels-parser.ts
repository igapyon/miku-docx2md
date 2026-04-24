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

  function parseRelationships(bytes: Uint8Array, sourcePath: string): Map<string, { target: string; type: string; mode: string }> {
    const document = xmlUtils?.parseXml(bytes);
    const relationshipElements = document ? xmlUtils?.findDescendantsByLocalName(document, "Relationship") || [] : [];
    const map = new Map<string, { target: string; type: string; mode: string }>();
    for (const element of relationshipElements) {
      const id = element.getAttribute("Id") || "";
      const rawTarget = element.getAttribute("Target") || "";
      const type = element.getAttribute("Type") || "";
      const mode = element.getAttribute("TargetMode") || "";
      map.set(id, {
        target: mode === "External" ? rawTarget : resolveZipPath(sourcePath, rawTarget),
        type,
        mode
      });
    }
    return map;
  }

  moduleRegistry.registerModule("relsParser", {
    resolveZipPath,
    parseRelationships
  });
})();
