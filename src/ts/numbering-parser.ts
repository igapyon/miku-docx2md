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
    getWordAttributeValue: (element: Element | null | undefined, localName: string, fallback?: string) => string;
  }>("xmlUtils");

  function parseInteger(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseNumbering(bytes?: Uint8Array): Docx2mdNumberingDefinition {
    const abstractNums = new Map<string, Docx2mdAbstractNumberingDefinition>();
    const nums = new Map<string, string>();
    if (!bytes) {
      return { abstractNums, nums };
    }
    const document = xmlUtils?.parseXml(bytes);
    if (!document) {
      return { abstractNums, nums };
    }

    for (const abstractNumElement of xmlUtils?.findDescendantsByLocalName(document, "abstractNum") || []) {
      const abstractNumId = xmlUtils?.getWordAttributeValue(abstractNumElement, "abstractNumId") || "";
      if (!abstractNumId) continue;
      const levels = new Map<number, Docx2mdNumberingLevel>();
      for (const levelElement of xmlUtils?.getChildrenByLocalName(abstractNumElement, "lvl") || []) {
        const level = parseInteger(xmlUtils?.getWordAttributeValue(levelElement, "ilvl"));
        if (level === null) continue;
        const numFmtElement = xmlUtils?.getChildrenByLocalName(levelElement, "numFmt")[0] || null;
        const lvlTextElement = xmlUtils?.getChildrenByLocalName(levelElement, "lvlText")[0] || null;
        levels.set(level, {
          level,
          format: xmlUtils?.getWordAttributeValue(numFmtElement, "val") || "",
          text: xmlUtils?.getWordAttributeValue(lvlTextElement, "val") || ""
        });
      }
      abstractNums.set(abstractNumId, {
        abstractNumId,
        levels
      });
    }

    for (const numElement of xmlUtils?.findDescendantsByLocalName(document, "num") || []) {
      const numId = xmlUtils?.getWordAttributeValue(numElement, "numId") || "";
      if (!numId) continue;
      const abstractNumIdElement = xmlUtils?.getChildrenByLocalName(numElement, "abstractNumId")[0] || null;
      const abstractNumId = xmlUtils?.getWordAttributeValue(abstractNumIdElement, "val") || "";
      if (abstractNumId) {
        nums.set(numId, abstractNumId);
      }
    }

    return { abstractNums, nums };
  }

  function resolveListKind(
    numbering: Docx2mdNumberingDefinition,
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
