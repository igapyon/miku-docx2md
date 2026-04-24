/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    parseXml: (bytes: Uint8Array) => Document;
    findDescendantsByLocalName: (parent: ParentNode, localName: string) => Element[];
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
  }>("xmlUtils");

  type NumberingLevel = {
    level: number;
    format: string;
    text: string;
  };

  type NumberingDefinition = {
    abstractNumId: string;
    levels: Map<number, NumberingLevel>;
  };

  function parseInteger(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseNumbering(bytes?: Uint8Array): {
    abstractNums: Map<string, NumberingDefinition>;
    nums: Map<string, string>;
  } {
    const abstractNums = new Map<string, NumberingDefinition>();
    const nums = new Map<string, string>();
    if (!bytes) {
      return { abstractNums, nums };
    }
    const document = xmlUtils?.parseXml(bytes);
    if (!document) {
      return { abstractNums, nums };
    }

    for (const abstractNumElement of xmlUtils?.findDescendantsByLocalName(document, "abstractNum") || []) {
      const abstractNumId = abstractNumElement.getAttribute("w:abstractNumId") || abstractNumElement.getAttribute("abstractNumId") || "";
      if (!abstractNumId) continue;
      const levels = new Map<number, NumberingLevel>();
      for (const levelElement of xmlUtils?.getChildrenByLocalName(abstractNumElement, "lvl") || []) {
        const level = parseInteger(levelElement.getAttribute("w:ilvl") || levelElement.getAttribute("ilvl"));
        if (level === null) continue;
        const numFmtElement = xmlUtils?.getChildrenByLocalName(levelElement, "numFmt")[0] || null;
        const lvlTextElement = xmlUtils?.getChildrenByLocalName(levelElement, "lvlText")[0] || null;
        levels.set(level, {
          level,
          format: numFmtElement?.getAttribute("w:val") || numFmtElement?.getAttribute("val") || "",
          text: lvlTextElement?.getAttribute("w:val") || lvlTextElement?.getAttribute("val") || ""
        });
      }
      abstractNums.set(abstractNumId, {
        abstractNumId,
        levels
      });
    }

    for (const numElement of xmlUtils?.findDescendantsByLocalName(document, "num") || []) {
      const numId = numElement.getAttribute("w:numId") || numElement.getAttribute("numId") || "";
      if (!numId) continue;
      const abstractNumIdElement = xmlUtils?.getChildrenByLocalName(numElement, "abstractNumId")[0] || null;
      const abstractNumId = abstractNumIdElement?.getAttribute("w:val") || abstractNumIdElement?.getAttribute("val") || "";
      if (abstractNumId) {
        nums.set(numId, abstractNumId);
      }
    }

    return { abstractNums, nums };
  }

  function resolveListKind(
    numbering: { abstractNums: Map<string, NumberingDefinition>; nums: Map<string, string> },
    numId: string,
    ilvl: number
  ): "bullet" | "ordered" | null {
    const abstractNumId = numbering.nums.get(numId);
    if (!abstractNumId) return null;
    const abstractNum = numbering.abstractNums.get(abstractNumId);
    if (!abstractNum) return null;
    const level = abstractNum.levels.get(ilvl);
    if (!level) return null;
    return level.format === "bullet" ? "bullet" : "ordered";
  }

  moduleRegistry.registerModule("numberingParser", {
    parseNumbering,
    resolveListKind
  });
})();
