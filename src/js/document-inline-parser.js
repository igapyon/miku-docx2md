/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const documentDrawingParser = moduleRegistry.getModule("documentDrawingParser");
    const documentSummary = moduleRegistry.getModule("documentSummary");
    const documentTextStyleParser = moduleRegistry.getModule("documentTextStyleParser");
    const documentHyperlinkParser = moduleRegistry.getModule("documentHyperlinkParser");
    function emptyStyle() {
        return (documentTextStyleParser === null || documentTextStyleParser === void 0 ? void 0 : documentTextStyleParser.emptyStyle()) || {
            bold: false,
            italic: false,
            strike: false,
            underline: false
        };
    }
    function getParagraphTextStyle(paragraph, styles) {
        return (documentTextStyleParser === null || documentTextStyleParser === void 0 ? void 0 : documentTextStyleParser.getParagraphTextStyle(paragraph, styles)) || emptyStyle();
    }
    function normalizeInlineText(text) {
        return text.replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
    }
    function describeUnsupportedElement(element, relationships) {
        return (documentDrawingParser === null || documentDrawingParser === void 0 ? void 0 : documentDrawingParser.describeUnsupportedElement(element, relationships))
            || (element.localName || "unknown");
    }
    function recordUnsupportedTrace(context, traces, type) {
        documentSummary === null || documentSummary === void 0 ? void 0 : documentSummary.recordUnsupportedSummary(context.summary, type);
        traces.push(type);
    }
    function extractTextboxText(textboxContent, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText) {
        const paragraphs = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(textboxContent, "p")) || [];
        const parts = paragraphs
            .map((paragraph) => {
            const text = extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, getParagraphTextStyle(paragraph, styles));
            if (!text)
                return "";
            return renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes);
        })
            .filter((text) => !!text);
        return parts.join("<br><br>").trim();
    }
    function renderRunElement(runElement, relationships, styles, context, unsupportedTypes, inheritedStyle, suppressUnderline) {
        const pieces = [];
        const effectiveStyle = (documentTextStyleParser === null || documentTextStyleParser === void 0 ? void 0 : documentTextStyleParser.resolveRunTextStyle(runElement, styles, inheritedStyle, suppressUnderline))
            || inheritedStyle;
        for (const child of Array.from(runElement.childNodes || [])) {
            if (child.nodeType !== 1)
                continue;
            const element = child;
            if (element.localName === "t") {
                const text = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getTextContent(element)) || "";
                pieces.push((documentTextStyleParser === null || documentTextStyleParser === void 0 ? void 0 : documentTextStyleParser.applyTextStyle(text, effectiveStyle)) || text);
            }
            else if (element.localName === "br") {
                pieces.push("<br>");
            }
            else if (element.localName === "drawing" || element.localName === "pict" || element.localName === "object") {
                recordUnsupportedTrace(context, unsupportedTypes, describeUnsupportedElement(element, relationships));
            }
        }
        return pieces.join("");
    }
    function renderHyperlinkElement(hyperlinkElement, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle) {
        const linkText = extractTextRuns(hyperlinkElement, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle, true);
        return (documentHyperlinkParser === null || documentHyperlinkParser === void 0 ? void 0 : documentHyperlinkParser.renderHyperlink(hyperlinkElement, linkText, relationships, context)) || linkText;
    }
    function extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle = emptyStyle(), suppressUnderline = false) {
        const pieces = [];
        for (const child of Array.from(paragraph.childNodes || [])) {
            if (child.nodeType !== 1)
                continue;
            const element = child;
            if (element.localName === "r") {
                pieces.push(renderRunElement(element, relationships, styles, context, unsupportedTypes, inheritedStyle, suppressUnderline));
            }
            else if (element.localName === "txbxContent") {
                const textboxText = extractTextboxText(element, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText);
                if (textboxText) {
                    if (pieces.length > 0) {
                        pieces.push("<br><br>");
                    }
                    pieces.push(textboxText);
                }
            }
            else if (element.localName === "hyperlink") {
                pieces.push(renderHyperlinkElement(element, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle));
            }
            else if (element.localName === "bookmarkStart" || element.localName === "bookmarkEnd" || element.localName === "pPr" || element.localName === "proofErr") {
                continue;
            }
            else {
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
