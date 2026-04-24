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
    function parseNumbering(bytes) {
        const abstractNums = new Map();
        const nums = new Map();
        if (!bytes) {
            return { abstractNums, nums };
        }
        const document = xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.parseXml(bytes);
        if (!document) {
            return { abstractNums, nums };
        }
        for (const abstractNumElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(document, "abstractNum")) || []) {
            const abstractNumId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(abstractNumElement, "abstractNumId")) || "";
            if (!abstractNumId)
                continue;
            const levels = new Map();
            for (const levelElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(abstractNumElement, "lvl")) || []) {
                const level = parseInteger(xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(levelElement, "ilvl"));
                if (level === null)
                    continue;
                const numFmtElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(levelElement, "numFmt")[0]) || null;
                const lvlTextElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(levelElement, "lvlText")[0]) || null;
                levels.set(level, {
                    level,
                    format: (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(numFmtElement, "val")) || "",
                    text: (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(lvlTextElement, "val")) || ""
                });
            }
            abstractNums.set(abstractNumId, {
                abstractNumId,
                levels
            });
        }
        for (const numElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(document, "num")) || []) {
            const numId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(numElement, "numId")) || "";
            if (!numId)
                continue;
            const abstractNumIdElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(numElement, "abstractNumId")[0]) || null;
            const abstractNumId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(abstractNumIdElement, "val")) || "";
            if (abstractNumId) {
                nums.set(numId, abstractNumId);
            }
        }
        return { abstractNums, nums };
    }
    function resolveListKind(numbering, numId, ilvl) {
        const abstractNumId = numbering.nums.get(numId);
        if (!abstractNumId)
            return null;
        const abstractNum = numbering.abstractNums.get(abstractNumId);
        if (!abstractNum)
            return null;
        const level = abstractNum.levels.get(ilvl);
        if (!level)
            return null;
        return level.format === "bullet" ? "bullet" : "ordered";
    }
    moduleRegistry.registerModule("numberingParser", {
        parseNumbering,
        resolveListKind
    });
})();
