/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
  }>("xmlUtils");
  const documentInlineParser = moduleRegistry.getModule<{
    getParagraphTextStyle: (
      paragraph: Element,
      styles: Map<string, Docx2mdParsedStyleDefinition>
    ) => Docx2mdParsedStyle;
    extractTextRuns: (
      paragraph: Element,
      relationships: Map<string, Docx2mdRelationship>,
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      numbering: Docx2mdNumberingDefinition,
      context: Docx2mdParseContext,
      unsupportedTypes: string[],
      renderStructuredParagraphText: Docx2mdStructuredParagraphRenderer,
      inheritedStyle?: Docx2mdParsedStyle,
      suppressUnderline?: boolean
    ) => string;
  }>("documentInlineParser");
  const documentParagraphParser = moduleRegistry.getModule<{
    renderStructuredParagraphText: (
      paragraph: Element,
      text: string,
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      numbering: Docx2mdNumberingDefinition,
      unsupportedTypes: string[]
    ) => string;
  }>("documentParagraphParser");

  function renderStructuredParagraphText(
    paragraph: Element,
    text: string,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    unsupportedTypes: string[]
  ): string {
    return documentParagraphParser?.renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes) || text;
  }

  function renderCellParagraph(
    paragraph: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    unsupportedTypes: string[]
  ): string {
    const text = documentInlineParser?.extractTextRuns(
      paragraph,
      relationships,
      styles,
      numbering,
      context,
      unsupportedTypes,
      renderStructuredParagraphText,
      documentInlineParser.getParagraphTextStyle(paragraph, styles)
    ) || "";
    if (!text) return "";
    return renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes);
  }

  function extractCellText(
    cell: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    tableUnsupportedTypes: string[]
  ): string {
    const paragraphs: Element[] = xmlUtils?.getChildrenByLocalName(cell, "p") || [];
    const parts = paragraphs
      .map((paragraph: Element) => renderCellParagraph(paragraph, relationships, styles, numbering, context, tableUnsupportedTypes))
      .filter((text: string) => !!text);
    return parts.join("<br><br>").trim();
  }

  moduleRegistry.registerModule("documentCellParser", {
    extractCellText
  });
})();
