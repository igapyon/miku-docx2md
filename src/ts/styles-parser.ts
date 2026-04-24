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
  }>("xmlUtils");

  type StyleRecord = {
    styleId: string;
    styleType: string;
    name: string;
    basedOn: string;
    outlineLevel: number | null;
    textStyle: {
      bold: boolean | null;
      italic: boolean | null;
      strike: boolean | null;
      underline: boolean | null;
    };
  };

  function parseInteger(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseStyleFlag(parent: Element | null, localName: string): boolean | null {
    if (!parent) return null;
    const element = xmlUtils?.getChildrenByLocalName(parent, localName)[0] || null;
    if (!element) return null;
    const value = element.getAttribute("w:val") || element.getAttribute("val") || "";
    if (!value) return true;
    return value !== "false" && value !== "0";
  }

  function parseStyles(bytes?: Uint8Array): Map<string, StyleRecord> {
    const styles = new Map<string, StyleRecord>();
    if (!bytes) return styles;
    const document = xmlUtils?.parseXml(bytes);
    if (!document) return styles;
    const styleElements = xmlUtils?.findDescendantsByLocalName(document, "style") || [];
    for (const styleElement of styleElements) {
      const styleId = styleElement.getAttribute("w:styleId") || styleElement.getAttribute("styleId") || "";
      if (!styleId) continue;
      const styleType = styleElement.getAttribute("w:type") || styleElement.getAttribute("type") || "";
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
        name: nameElement?.getAttribute("w:val") || nameElement?.getAttribute("val") || "",
        basedOn: basedOnElement?.getAttribute("w:val") || basedOnElement?.getAttribute("val") || "",
        outlineLevel: parseInteger(outlineLevelElement?.getAttribute("w:val") || outlineLevelElement?.getAttribute("val")),
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

  function resolveStyleChain(styles: Map<string, StyleRecord>, styleId: string): StyleRecord[] {
    const chain: StyleRecord[] = [];
    const visited = new Set<string>();
    let cursor = styleId;
    while (cursor && styles.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      const style = styles.get(cursor) as StyleRecord;
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
