/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const stylesParser = moduleRegistry.getModule("stylesParser");
    const documentDrawingParser = moduleRegistry.getModule("documentDrawingParser");
    const documentAnchorParser = moduleRegistry.getModule("documentAnchorParser");
    const documentSummary = moduleRegistry.getModule("documentSummary");
    function hasEnabledElement(parent, localName) {
        if (!parent)
            return false;
        const element = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(parent, localName)[0]) || null;
        if (!element)
            return false;
        const value = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(element, "val")) || "";
        return value !== "false" && value !== "0";
    }
    function readStyleValue(parent, localName) {
        if (!parent)
            return null;
        const element = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(parent, localName)[0]) || null;
        if (!element)
            return null;
        const value = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(element, "val")) || "";
        if (!value)
            return true;
        return value !== "false" && value !== "0";
    }
    function emptyStyle() {
        return {
            bold: false,
            italic: false,
            strike: false,
            underline: false
        };
    }
    function applyTextStyle(text, style) {
        if (!text)
            return "";
        let result = text;
        if (style.underline)
            result = `<ins>${result}</ins>`;
        if (style.strike)
            result = `~~${result}~~`;
        if (style.italic)
            result = `*${result}*`;
        if (style.bold)
            result = `**${result}**`;
        return result;
    }
    function applyStyleOverride(base, override) {
        return {
            bold: override.bold === null ? base.bold : override.bold,
            italic: override.italic === null ? base.italic : override.italic,
            strike: override.strike === null ? base.strike : override.strike,
            underline: override.underline === null ? base.underline : override.underline
        };
    }
    function readStyleOverrideFromRunProperties(properties) {
        return {
            bold: readStyleValue(properties, "b"),
            italic: readStyleValue(properties, "i"),
            strike: readStyleValue(properties, "strike"),
            underline: readStyleValue(properties, "u")
        };
    }
    function resolveTextStyleOverrideFromStyleId(styles, styleId, expectedStyleType) {
        if (!styleId) {
            return {
                bold: null,
                italic: null,
                strike: null,
                underline: null
            };
        }
        const chain = (stylesParser === null || stylesParser === void 0 ? void 0 : stylesParser.resolveStyleChain(styles, styleId)) || [];
        let resolved = {
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
    function getParagraphTextStyle(paragraph, styles) {
        const paragraphProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraph, "pPr")[0]) || null;
        const paragraphStyleElement = paragraphProperties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "pStyle")[0]) || null) : null;
        const paragraphStyleId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(paragraphStyleElement, "val")) || "";
        const styleFromParagraphStyle = applyStyleOverride(emptyStyle(), resolveTextStyleOverrideFromStyleId(styles, paragraphStyleId, "paragraph"));
        const paragraphRunProperties = paragraphProperties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "rPr")[0]) || null) : null;
        return applyStyleOverride(styleFromParagraphStyle, readStyleOverrideFromRunProperties(paragraphRunProperties));
    }
    function normalizeInlineText(text) {
        return text.replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
    }
    function normalizeAnchorName(name) {
        return (documentAnchorParser === null || documentAnchorParser === void 0 ? void 0 : documentAnchorParser.normalizeAnchorName(name)) || "";
    }
    function normalizeRelationshipAnchorTarget(target) {
        return (documentAnchorParser === null || documentAnchorParser === void 0 ? void 0 : documentAnchorParser.normalizeRelationshipAnchorTarget(target)) || "";
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
    function renderRunElement(runElement, styles, inheritedStyle, suppressUnderline) {
        const pieces = [];
        const properties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(runElement, "rPr")[0]) || null;
        const runStyleElement = properties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(properties, "rStyle")[0]) || null) : null;
        const runStyleId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(runStyleElement, "val")) || "";
        const styleFromRunStyle = resolveTextStyleOverrideFromStyleId(styles, runStyleId, "character");
        const style = applyStyleOverride(applyStyleOverride(inheritedStyle, styleFromRunStyle), readStyleOverrideFromRunProperties(properties));
        const effectiveStyle = suppressUnderline ? { ...style, underline: false } : style;
        const textElements = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(runElement, "t")) || [];
        for (const textElement of textElements) {
            pieces.push(applyTextStyle((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getTextContent(textElement)) || "", effectiveStyle));
        }
        const breakElements = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(runElement, "br")) || [];
        if (breakElements.length > 0) {
            pieces.push("<br>".repeat(breakElements.length));
        }
        return pieces.join("");
    }
    function renderHyperlinkElement(hyperlinkElement, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle) {
        const linkText = extractTextRuns(hyperlinkElement, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle, true);
        const relationshipId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getNamespacedAttributeValue(hyperlinkElement, "r", "id")) || "";
        const anchor = normalizeAnchorName((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(hyperlinkElement, "anchor")) || "");
        const relationship = relationshipId ? relationships.get(relationshipId) || null : null;
        const relationshipAnchor = relationship ? normalizeRelationshipAnchorTarget(relationship.target) : "";
        if ((relationship === null || relationship === void 0 ? void 0 : relationship.mode) === "External") {
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
    function extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, inheritedStyle = emptyStyle(), suppressUnderline = false) {
        const pieces = [];
        for (const child of Array.from(paragraph.childNodes || [])) {
            if (child.nodeType !== 1)
                continue;
            const element = child;
            if (element.localName === "r") {
                pieces.push(renderRunElement(element, styles, inheritedStyle, suppressUnderline));
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
            else if (element.localName === "bookmarkStart" || element.localName === "bookmarkEnd" || element.localName === "pPr") {
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
