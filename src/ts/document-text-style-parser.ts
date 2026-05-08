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

  function readStyleValue(parent: Element | null, localName: string): boolean | null {
    if (!parent) return null;
    const element = xmlUtils?.getChildrenByLocalName(parent, localName)[0] || null;
    if (!element) return null;
    const value = xmlUtils?.getWordAttributeValue(element, "val") || "";
    if (!value) return true;
    return value !== "false" && value !== "0";
  }

  function emptyStyle(): Docx2mdParsedStyle {
    return {
      bold: false,
      italic: false,
      strike: false,
      underline: false
    };
  }

  function applyTextStyle(text: string, style: Docx2mdParsedStyle): string {
    if (!text) return "";
    let result = text;
    if (style.underline) result = `<ins>${result}</ins>`;
    if (style.strike) result = `~~${result}~~`;
    if (style.italic) result = `*${result}*`;
    if (style.bold) result = `**${result}**`;
    return result;
  }

  function applyStyleOverride(base: Docx2mdParsedStyle, override: Docx2mdParsedStyleOverride): Docx2mdParsedStyle {
    return {
      bold: override.bold === null ? base.bold : override.bold,
      italic: override.italic === null ? base.italic : override.italic,
      strike: override.strike === null ? base.strike : override.strike,
      underline: override.underline === null ? base.underline : override.underline
    };
  }

  function readStyleOverrideFromRunProperties(properties: Element | null): Docx2mdParsedStyleOverride {
    return {
      bold: readStyleValue(properties, "b"),
      italic: readStyleValue(properties, "i"),
      strike: readStyleValue(properties, "strike"),
      underline: readStyleValue(properties, "u")
    };
  }

  function resolveTextStyleOverrideFromStyleId(
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    styleId: string,
    expectedStyleType?: string
  ): Docx2mdParsedStyleOverride {
    if (!styleId) {
      return {
        bold: null,
        italic: null,
        strike: null,
        underline: null
      };
    }
    const chain = stylesParser?.resolveStyleChain(styles, styleId) || [];
    let resolved: Docx2mdParsedStyleOverride = {
      bold: null,
      italic: null,
      strike: null,
      underline: null
    };
    for (const style of chain.slice().reverse()) {
      if (expectedStyleType && style.styleType && style.styleType !== expectedStyleType) {
        continue;
      }
      resolved = {
        bold: style.textStyle.bold === null ? resolved.bold : style.textStyle.bold,
        italic: style.textStyle.italic === null ? resolved.italic : style.textStyle.italic,
        strike: style.textStyle.strike === null ? resolved.strike : style.textStyle.strike,
        underline: style.textStyle.underline === null ? resolved.underline : style.textStyle.underline
      };
    }
    return resolved;
  }

  function getParagraphTextStyle(
    paragraph: Element,
    styles: Map<string, Docx2mdParsedStyleDefinition>
  ): Docx2mdParsedStyle {
    const paragraphProperties = xmlUtils?.getChildrenByLocalName(paragraph, "pPr")[0] || null;
    const paragraphStyleElement = paragraphProperties ? (xmlUtils?.getChildrenByLocalName(paragraphProperties, "pStyle")[0] || null) : null;
    const paragraphStyleId = xmlUtils?.getWordAttributeValue(paragraphStyleElement, "val") || "";
    const styleFromParagraphStyle = applyStyleOverride(emptyStyle(), resolveTextStyleOverrideFromStyleId(styles, paragraphStyleId, "paragraph"));
    const paragraphRunProperties = paragraphProperties ? (xmlUtils?.getChildrenByLocalName(paragraphProperties, "rPr")[0] || null) : null;
    return applyStyleOverride(styleFromParagraphStyle, readStyleOverrideFromRunProperties(paragraphRunProperties));
  }

  function resolveRunTextStyle(
    runElement: Element,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    inheritedStyle: Docx2mdParsedStyle,
    suppressUnderline: boolean
  ): Docx2mdParsedStyle {
    const properties = xmlUtils?.getChildrenByLocalName(runElement, "rPr")[0] || null;
    const runStyleElement = properties ? (xmlUtils?.getChildrenByLocalName(properties, "rStyle")[0] || null) : null;
    const runStyleId = xmlUtils?.getWordAttributeValue(runStyleElement, "val") || "";
    const styleFromRunStyle = resolveTextStyleOverrideFromStyleId(styles, runStyleId, "character");
    const style = applyStyleOverride(
      applyStyleOverride(inheritedStyle, styleFromRunStyle),
      readStyleOverrideFromRunProperties(properties)
    );
    return suppressUnderline ? { ...style, underline: false } : style;
  }

  moduleRegistry.registerModule("documentTextStyleParser", {
    emptyStyle,
    applyTextStyle,
    getParagraphTextStyle,
    resolveRunTextStyle
  });
})();
