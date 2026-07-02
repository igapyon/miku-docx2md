/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
    getTextContent: (node: Node | null | undefined) => string;
  }>("xmlUtils");
  const documentDrawingParser = moduleRegistry.getModule<{
    describeUnsupportedElement: (
      element: Element,
      relationships: Map<string, Docx2mdRelationship>
    ) => string;
  }>("documentDrawingParser");
  const documentSummary = moduleRegistry.getModule<{
    recordUnsupportedSummary: (summary: Docx2mdParsedSummary, type: string) => void;
  }>("documentSummary");
  const documentTextStyleParser = moduleRegistry.getModule<{
    emptyStyle: () => Docx2mdParsedStyle;
    applyTextStyle: (text: string, style: Docx2mdParsedStyle) => string;
    getParagraphTextStyle: (
      paragraph: Element,
      styles: Map<string, Docx2mdParsedStyleDefinition>
    ) => Docx2mdParsedStyle;
    resolveRunTextStyle: (
      runElement: Element,
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      inheritedStyle: Docx2mdParsedStyle,
      suppressUnderline: boolean
    ) => Docx2mdParsedStyle;
  }>("documentTextStyleParser");
  const documentHyperlinkParser = moduleRegistry.getModule<{
    renderHyperlink: (
      hyperlinkElement: Element,
      linkText: string,
      relationships: Map<string, Docx2mdRelationship>,
      context: Docx2mdParseContext
    ) => string;
  }>("documentHyperlinkParser");

  function emptyStyle(): Docx2mdParsedStyle {
    return documentTextStyleParser?.emptyStyle() || {
      bold: false,
      italic: false,
      strike: false,
      underline: false
    };
  }

  function getParagraphTextStyle(
    paragraph: Element,
    styles: Map<string, Docx2mdParsedStyleDefinition>
  ): Docx2mdParsedStyle {
    return documentTextStyleParser?.getParagraphTextStyle(paragraph, styles) || emptyStyle();
  }

  function normalizeInlineText(text: string): string {
    return text.replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
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
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    context: Docx2mdParseContext,
    unsupportedTypes: string[],
    inheritedStyle: Docx2mdParsedStyle,
    suppressUnderline: boolean
  ): string {
    const pieces: string[] = [];
    const effectiveStyle = documentTextStyleParser?.resolveRunTextStyle(runElement, styles, inheritedStyle, suppressUnderline)
      || inheritedStyle;
    for (const child of Array.from(runElement.childNodes || [])) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      if (element.localName === "t") {
        const text = xmlUtils?.getTextContent(element) || "";
        pieces.push(documentTextStyleParser?.applyTextStyle(text, effectiveStyle) || text);
      } else if (element.localName === "delText") {
        const text = xmlUtils?.getTextContent(element) || "";
        pieces.push(documentTextStyleParser?.applyTextStyle(text, effectiveStyle) || text);
      } else if (element.localName === "br") {
        pieces.push("<br>");
      } else if (element.localName === "drawing" || element.localName === "pict" || element.localName === "object") {
        recordUnsupportedTrace(context, unsupportedTypes, describeUnsupportedElement(element, relationships));
      }
    }
    return pieces.join("");
  }

  function renderTrackedChangeElement(
    changeElement: Element,
    marker: "inserted" | "deleted",
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    unsupportedTypes: string[],
    renderStructuredParagraphText: Docx2mdStructuredParagraphRenderer,
    inheritedStyle: Docx2mdParsedStyle,
    suppressUnderline: boolean
  ): string {
    const text = extractTextRuns(changeElement, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle, suppressUnderline);
    if (!text) return "";
    return marker === "inserted" ? `<ins>${text}</ins>` : `~~${text}~~`;
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
    return documentHyperlinkParser?.renderHyperlink(hyperlinkElement, linkText, relationships, context) || linkText;
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
        pieces.push(renderRunElement(element, relationships, styles, context, unsupportedTypes, inheritedStyle, suppressUnderline));
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
      } else if (element.localName === "ins") {
        pieces.push(renderTrackedChangeElement(element, "inserted", relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle, suppressUnderline));
      } else if (element.localName === "del") {
        pieces.push(renderTrackedChangeElement(element, "deleted", relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle, suppressUnderline));
      } else if (element.localName === "bookmarkStart" || element.localName === "bookmarkEnd" || element.localName === "pPr" || element.localName === "proofErr") {
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
