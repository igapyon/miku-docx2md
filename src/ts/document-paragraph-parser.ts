/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
    getWordAttributeValue: (element: Element | null | undefined, localName: string, fallback?: string) => string;
  }>("xmlUtils");
  const stylesParser = moduleRegistry.getModule<{
    resolveStyleChain: (
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      styleId: string
    ) => Docx2mdParsedStyleDefinition[];
  }>("stylesParser");
  const numberingParser = moduleRegistry.getModule<{
    resolveListKind: (
      numbering: Docx2mdNumberingDefinition,
      numId: string,
      ilvl: number
    ) => "bullet" | "ordered" | null;
  }>("numberingParser");

  type ListMetadata = {
    listKind: "bullet" | "ordered";
    indent: number;
  };

  function isHeadingName(name: string): number | null {
    const match = /^(Heading|見出し)\s*([1-6])$/i.exec(name.trim());
    if (!match) return null;
    return Number.parseInt(match[2], 10);
  }

  function getParagraphProperties(paragraph: Element): Element | null {
    return xmlUtils?.getChildrenByLocalName(paragraph, "pPr")[0] || null;
  }

  function getParagraphStyleId(paragraphProperties: Element): string {
    const paragraphStyle = xmlUtils?.getChildrenByLocalName(paragraphProperties, "pStyle")[0] || null;
    return xmlUtils?.getWordAttributeValue(paragraphStyle, "val") || "";
  }

  function getOutlineLevel(paragraphProperties: Element): number | null {
    const outlineLevel = xmlUtils?.getChildrenByLocalName(paragraphProperties, "outlineLvl")[0] || null;
    const value = xmlUtils?.getWordAttributeValue(outlineLevel, "val") || "";
    const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isFinite(parsed) ? Math.min(parsed + 1, 6) : null;
  }

  function getNumberingProperties(paragraphProperties: Element): Element | null {
    return xmlUtils?.getChildrenByLocalName(paragraphProperties, "numPr")[0] || null;
  }

  function getHeadingLevel(
    paragraph: Element,
    styles: Map<string, Docx2mdParsedStyleDefinition>
  ): number | null {
    const paragraphProperties = getParagraphProperties(paragraph);
    if (!paragraphProperties) return null;
    const styleId = getParagraphStyleId(paragraphProperties);
    if (styleId) {
      const directLevel = isHeadingName(styleId);
      if (directLevel) return directLevel;
      const chain = stylesParser?.resolveStyleChain(styles, styleId) || [];
      for (const style of chain) {
        const nameLevel = isHeadingName(style.name) || isHeadingName(style.styleId);
        if (nameLevel) return nameLevel;
        if (style.outlineLevel !== null) return Math.min(style.outlineLevel + 1, 6);
      }
    }
    return getOutlineLevel(paragraphProperties);
  }

  function getListMetadata(
    paragraph: Element,
    numbering: Docx2mdNumberingDefinition
  ): ListMetadata | null {
    const paragraphProperties = getParagraphProperties(paragraph);
    if (!paragraphProperties) return null;
    const numberingProperties = getNumberingProperties(paragraphProperties);
    if (!numberingProperties) return null;
    const numIdElement = xmlUtils?.getChildrenByLocalName(numberingProperties, "numId")[0] || null;
    const ilvlElement = xmlUtils?.getChildrenByLocalName(numberingProperties, "ilvl")[0] || null;
    const numId = xmlUtils?.getWordAttributeValue(numIdElement, "val") || "";
    const indent = Number.parseInt(xmlUtils?.getWordAttributeValue(ilvlElement, "val", "0") || "0", 10);
    if (!numId) return null;
    const listKind = numberingParser?.resolveListKind(numbering, numId, Number.isFinite(indent) ? indent : 0) || null;
    if (!listKind) return null;
    return {
      listKind,
      indent: Number.isFinite(indent) ? indent : 0
    };
  }

  function renderStructuredParagraphText(
    paragraph: Element,
    text: string,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    unsupportedTypes: string[]
  ): string {
    const listMetadata = getListMetadata(paragraph, numbering);
    if (!listMetadata) {
      const level = getHeadingLevel(paragraph, styles);
      if (level) {
        return `${"#".repeat(Math.max(1, Math.min(level, 6)))} ${text}`;
      }
      return text;
    }
    const indent = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(Math.max(0, listMetadata.indent));
    const marker = listMetadata.listKind === "ordered" ? "1." : "-";
    return `${indent}${marker} ${text}`;
  }

  moduleRegistry.registerModule("documentParagraphParser", {
    getHeadingLevel,
    getListMetadata,
    renderStructuredParagraphText
  });
})();
