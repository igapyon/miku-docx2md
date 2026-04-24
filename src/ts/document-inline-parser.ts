/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
    getTextContent: (node: Node | null | undefined) => string;
    getWordAttributeValue: (element: Element | null | undefined, localName: string, fallback?: string) => string;
    getNamespacedAttributeValue: (element: Element | null | undefined, namespacePrefix: string, localName: string, fallback?: string) => string;
  }>("xmlUtils");
  const stylesParser = moduleRegistry.getModule<{
    resolveStyleChain: (
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      styleId: string
    ) => Docx2mdParsedStyleDefinition[];
  }>("stylesParser");
  const documentDrawingParser = moduleRegistry.getModule<{
    describeUnsupportedElement: (
      element: Element,
      relationships: Map<string, Docx2mdRelationship>
    ) => string;
  }>("documentDrawingParser");
  const documentAnchorParser = moduleRegistry.getModule<{
    normalizeAnchorName: (name: string) => string;
    normalizeRelationshipAnchorTarget: (target: string) => string;
  }>("documentAnchorParser");
  const documentSummary = moduleRegistry.getModule<{
    recordUnsupportedSummary: (summary: Docx2mdParsedSummary, type: string) => void;
  }>("documentSummary");

  function hasEnabledElement(parent: Element | null, localName: string): boolean {
    if (!parent) return false;
    const element = xmlUtils?.getChildrenByLocalName(parent, localName)[0] || null;
    if (!element) return false;
    const value = xmlUtils?.getWordAttributeValue(element, "val") || "";
    return value !== "false" && value !== "0";
  }

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

  function normalizeInlineText(text: string): string {
    return text.replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
  }

  function normalizeAnchorName(name: string): string {
    return documentAnchorParser?.normalizeAnchorName(name) || "";
  }

  function normalizeRelationshipAnchorTarget(target: string): string {
    return documentAnchorParser?.normalizeRelationshipAnchorTarget(target) || "";
  }

  function describeUnsupportedElement(
    element: Element,
    relationships: Map<string, Docx2mdRelationship>
  ): string {
    return documentDrawingParser?.describeUnsupportedElement(element, relationships)
      || (element.localName || "unknown");
  }

  function recordUnsupportedTrace(context: Docx2mdParseContext, traces: string[], type: string): void {
    documentSummary?.recordUnsupportedSummary(context.summary, type);
    traces.push(type);
  }

  function extractTextboxText(
    textboxContent: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    unsupportedTypes: string[],
    renderStructuredParagraphText: Docx2mdStructuredParagraphRenderer
  ): string {
    const paragraphs: Element[] = xmlUtils?.getChildrenByLocalName(textboxContent, "p") || [];
    const parts = paragraphs
      .map((paragraph: Element) => {
        const text = extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, getParagraphTextStyle(paragraph, styles));
        if (!text) return "";
        return renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes);
      })
      .filter((text: string) => !!text);
    return parts.join("<br><br>").trim();
  }

  function renderRunElement(
    runElement: Element,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    inheritedStyle: Docx2mdParsedStyle,
    suppressUnderline: boolean
  ): string {
    const pieces: string[] = [];
    const properties = xmlUtils?.getChildrenByLocalName(runElement, "rPr")[0] || null;
    const runStyleElement = properties ? (xmlUtils?.getChildrenByLocalName(properties, "rStyle")[0] || null) : null;
    const runStyleId = xmlUtils?.getWordAttributeValue(runStyleElement, "val") || "";
    const styleFromRunStyle = resolveTextStyleOverrideFromStyleId(styles, runStyleId, "character");
    const style = applyStyleOverride(
      applyStyleOverride(inheritedStyle, styleFromRunStyle),
      readStyleOverrideFromRunProperties(properties)
    );
    const effectiveStyle = suppressUnderline ? { ...style, underline: false } : style;
    const textElements = xmlUtils?.getChildrenByLocalName(runElement, "t") || [];
    for (const textElement of textElements) {
      pieces.push(applyTextStyle(xmlUtils?.getTextContent(textElement) || "", effectiveStyle));
    }
    const breakElements = xmlUtils?.getChildrenByLocalName(runElement, "br") || [];
    if (breakElements.length > 0) {
      pieces.push("<br>".repeat(breakElements.length));
    }
    return pieces.join("");
  }

  function renderHyperlinkElement(
    hyperlinkElement: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    unsupportedTypes: string[],
    renderStructuredParagraphText: Docx2mdStructuredParagraphRenderer,
    inheritedStyle: Docx2mdParsedStyle
  ): string {
    const linkText = extractTextRuns(hyperlinkElement, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle, true);
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

  function extractTextRuns(
    paragraph: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    unsupportedTypes: string[],
    renderStructuredParagraphText: Docx2mdStructuredParagraphRenderer,
    inheritedStyle: Docx2mdParsedStyle = emptyStyle(),
    suppressUnderline: boolean = false
  ): string {
    const pieces: string[] = [];
    for (const child of Array.from(paragraph.childNodes || [])) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      if (element.localName === "r") {
        pieces.push(renderRunElement(element, styles, inheritedStyle, suppressUnderline));
      } else if (element.localName === "txbxContent") {
        const textboxText = extractTextboxText(element, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText);
        if (textboxText) {
          if (pieces.length > 0) {
            pieces.push("<br><br>");
          }
          pieces.push(textboxText);
        }
      } else if (element.localName === "hyperlink") {
        pieces.push(renderHyperlinkElement(element, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle));
      } else if (element.localName === "bookmarkStart" || element.localName === "bookmarkEnd" || element.localName === "pPr") {
        continue;
      } else {
        recordUnsupportedTrace(context, unsupportedTypes, describeUnsupportedElement(element, relationships));
      }
    }
    return normalizeInlineText(pieces.join(""));
  }

  moduleRegistry.registerModule("documentInlineParser", {
    getParagraphTextStyle,
    extractTextRuns
  });
})();
