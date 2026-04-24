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
    getWordAttributeValue: (element: Element | null | undefined, localName: string, fallback?: string) => string;
  }>("xmlUtils");

  function parseInteger(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseStyleFlag(parent: Element | null, localName: string): boolean | null {
    if (!parent) return null;
    const element = xmlUtils?.getChildrenByLocalName(parent, localName)[0] || null;
    if (!element) return null;
    const value = xmlUtils?.getWordAttributeValue(element, "val") || "";
    if (!value) return true;
    return value !== "false" && value !== "0";
  }

  function parseStyles(bytes?: Uint8Array): Map<string, Docx2mdParsedStyleDefinition> {
    const styles = new Map<string, Docx2mdParsedStyleDefinition>();
    if (!bytes) return styles;
    const document = xmlUtils?.parseXml(bytes);
    if (!document) return styles;
    const styleElements = xmlUtils?.findDescendantsByLocalName(document, "style") || [];
    for (const styleElement of styleElements) {
      const styleId = xmlUtils?.getWordAttributeValue(styleElement, "styleId") || "";
      if (!styleId) continue;
      const styleType = xmlUtils?.getWordAttributeValue(styleElement, "type") || "";
      const nameElement = xmlUtils?.getChildrenByLocalName(styleElement, "name")[0] || null;
      const basedOnElement = xmlUtils?.getChildrenByLocalName(styleElement, "basedOn")[0] || null;
      const paragraphProperties = xmlUtils?.getChildrenByLocalName(styleElement, "pPr")[0] || null;
      const runProperties = xmlUtils?.getChildrenByLocalName(styleElement, "rPr")[0] || null;
      const outlineLevelElement = paragraphProperties
        ? (xmlUtils?.getChildrenByLocalName(paragraphProperties, "outlineLvl")[0] || null)
        : null;
      styles.set(styleId, {
        styleId,
        styleType,
        name: xmlUtils?.getWordAttributeValue(nameElement, "val") || "",
        basedOn: xmlUtils?.getWordAttributeValue(basedOnElement, "val") || "",
        outlineLevel: parseInteger(xmlUtils?.getWordAttributeValue(outlineLevelElement, "val")),
        textStyle: {
          bold: parseStyleFlag(runProperties, "b"),
          italic: parseStyleFlag(runProperties, "i"),
          strike: parseStyleFlag(runProperties, "strike"),
          underline: parseStyleFlag(runProperties, "u")
        }
      });
    }
    return styles;
  }

  function resolveStyleChain(
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    styleId: string
  ): Docx2mdParsedStyleDefinition[] {
    const chain: Docx2mdParsedStyleDefinition[] = [];
    const visited = new Set<string>();
    let cursor = styleId;
    while (cursor && styles.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      const style = styles.get(cursor) as Docx2mdParsedStyleDefinition;
      chain.push(style);
      cursor = style.basedOn;
    }
    return chain;
  }

  moduleRegistry.registerModule("stylesParser", {
    parseStyles,
    resolveStyleChain
  });
})();
