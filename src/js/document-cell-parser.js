/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const documentInlineParser = moduleRegistry.getModule("documentInlineParser");
    const documentParagraphParser = moduleRegistry.getModule("documentParagraphParser");
    function renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes) {
        return (documentParagraphParser === null || documentParagraphParser === void 0 ? void 0 : documentParagraphParser.renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes)) || text;
    }
    function renderCellParagraph(paragraph, relationships, styles, numbering, context, unsupportedTypes) {
        const text = (documentInlineParser === null || documentInlineParser === void 0 ? void 0 : documentInlineParser.extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, documentInlineParser.getParagraphTextStyle(paragraph, styles))) || "";
        if (!text)
            return "";
        return renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes);
    }
    function extractCellText(cell, relationships, styles, numbering, context, tableUnsupportedTypes) {
        const paragraphs = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cell, "p")) || [];
        const parts = paragraphs
            .map((paragraph) => renderCellParagraph(paragraph, relationships, styles, numbering, context, tableUnsupportedTypes))
            .filter((text) => !!text);
        return parts.join("<br><br>").trim();
    }
    moduleRegistry.registerModule("documentCellParser", {
        extractCellText
    });
})();
