/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const stylesParser = moduleRegistry.getModule("stylesParser");
    const numberingParser = moduleRegistry.getModule("numberingParser");
    function isHeadingName(name) {
        const match = /^(Heading|見出し)\s*([1-6])$/i.exec(name.trim());
        if (!match)
            return null;
        return Number.parseInt(match[2], 10);
    }
    function getParagraphProperties(paragraph) {
        return (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraph, "pPr")[0]) || null;
    }
    function getParagraphStyleId(paragraphProperties) {
        const paragraphStyle = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "pStyle")[0]) || null;
        return (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(paragraphStyle, "val")) || "";
    }
    function getOutlineLevel(paragraphProperties) {
        const outlineLevel = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "outlineLvl")[0]) || null;
        const value = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(outlineLevel, "val")) || "";
        const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
        return Number.isFinite(parsed) ? Math.min(parsed + 1, 6) : null;
    }
    function getNumberingProperties(paragraphProperties) {
        return (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "numPr")[0]) || null;
    }
    function getHeadingLevel(paragraph, styles) {
        const paragraphProperties = getParagraphProperties(paragraph);
        if (!paragraphProperties)
            return null;
        const styleId = getParagraphStyleId(paragraphProperties);
        if (styleId) {
            const directLevel = isHeadingName(styleId);
            if (directLevel)
                return directLevel;
            const chain = (stylesParser === null || stylesParser === void 0 ? void 0 : stylesParser.resolveStyleChain(styles, styleId)) || [];
            for (const style of chain) {
                const nameLevel = isHeadingName(style.name) || isHeadingName(style.styleId);
                if (nameLevel)
                    return nameLevel;
                if (style.outlineLevel !== null)
                    return Math.min(style.outlineLevel + 1, 6);
            }
        }
        return getOutlineLevel(paragraphProperties);
    }
    function getListMetadata(paragraph, numbering) {
        const paragraphProperties = getParagraphProperties(paragraph);
        if (!paragraphProperties)
            return null;
        const numberingProperties = getNumberingProperties(paragraphProperties);
        if (!numberingProperties)
            return null;
        const numIdElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(numberingProperties, "numId")[0]) || null;
        const ilvlElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(numberingProperties, "ilvl")[0]) || null;
        const numId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(numIdElement, "val")) || "";
        const indent = Number.parseInt((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(ilvlElement, "val", "0")) || "0", 10);
        if (!numId)
            return null;
        const listKind = (numberingParser === null || numberingParser === void 0 ? void 0 : numberingParser.resolveListKind(numbering, numId, Number.isFinite(indent) ? indent : 0)) || null;
        if (!listKind)
            return null;
        return {
            listKind,
            indent: Number.isFinite(indent) ? indent : 0
        };
    }
    function renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes) {
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
