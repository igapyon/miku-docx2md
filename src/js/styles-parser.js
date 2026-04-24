/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    function parseInteger(value) {
        if (!value)
            return null;
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }
    function parseStyles(bytes) {
        const styles = new Map();
        if (!bytes)
            return styles;
        const document = xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.parseXml(bytes);
        if (!document)
            return styles;
        const styleElements = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(document, "style")) || [];
        for (const styleElement of styleElements) {
            const styleId = styleElement.getAttribute("w:styleId") || styleElement.getAttribute("styleId") || "";
            if (!styleId)
                continue;
            const nameElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(styleElement, "name")[0]) || null;
            const basedOnElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(styleElement, "basedOn")[0]) || null;
            const paragraphProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(styleElement, "pPr")[0]) || null;
            const outlineLevelElement = paragraphProperties
                ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "outlineLvl")[0]) || null)
                : null;
            styles.set(styleId, {
                styleId,
                name: (nameElement === null || nameElement === void 0 ? void 0 : nameElement.getAttribute("w:val")) || (nameElement === null || nameElement === void 0 ? void 0 : nameElement.getAttribute("val")) || "",
                basedOn: (basedOnElement === null || basedOnElement === void 0 ? void 0 : basedOnElement.getAttribute("w:val")) || (basedOnElement === null || basedOnElement === void 0 ? void 0 : basedOnElement.getAttribute("val")) || "",
                outlineLevel: parseInteger((outlineLevelElement === null || outlineLevelElement === void 0 ? void 0 : outlineLevelElement.getAttribute("w:val")) || (outlineLevelElement === null || outlineLevelElement === void 0 ? void 0 : outlineLevelElement.getAttribute("val")))
            });
        }
        return styles;
    }
    function resolveStyleChain(styles, styleId) {
        const chain = [];
        const visited = new Set();
        let cursor = styleId;
        while (cursor && styles.has(cursor) && !visited.has(cursor)) {
            visited.add(cursor);
            const style = styles.get(cursor);
            chain.push(style);
            cursor = style.basedOn;
        }
        return chain;
    }
    moduleRegistry.registerModule("stylesParser", {
        parseStyles,
        resolveStyleChain
    });
})();
