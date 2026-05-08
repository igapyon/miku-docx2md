/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const stylesParser = moduleRegistry.getModule("stylesParser");
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
    function resolveRunTextStyle(runElement, styles, inheritedStyle, suppressUnderline) {
        const properties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(runElement, "rPr")[0]) || null;
        const runStyleElement = properties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(properties, "rStyle")[0]) || null) : null;
        const runStyleId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(runStyleElement, "val")) || "";
        const styleFromRunStyle = resolveTextStyleOverrideFromStyleId(styles, runStyleId, "character");
        const style = applyStyleOverride(applyStyleOverride(inheritedStyle, styleFromRunStyle), readStyleOverrideFromRunProperties(properties));
        return suppressUnderline ? { ...style, underline: false } : style;
    }
    moduleRegistry.registerModule("documentTextStyleParser", {
        emptyStyle,
        applyTextStyle,
        getParagraphTextStyle,
        resolveRunTextStyle
    });
})();
