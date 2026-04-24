/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    function getGridSpan(cell) {
        const cellProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cell, "tcPr")[0]) || null;
        const gridSpan = cellProperties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cellProperties, "gridSpan")[0]) || null) : null;
        const value = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(gridSpan, "val", "1")) || "1";
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }
    function getVerticalMergeState(cell) {
        const cellProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cell, "tcPr")[0]) || null;
        const verticalMerge = cellProperties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cellProperties, "vMerge")[0]) || null) : null;
        if (!verticalMerge)
            return null;
        const value = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(verticalMerge, "val")) || "";
        if (!value || value === "continue")
            return "continue";
        if (value === "restart")
            return "restart";
        return null;
    }
    function normalizeRows(rows) {
        const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
        for (const row of rows) {
            while (row.length < columnCount) {
                row.push("");
            }
        }
    }
    function appendMergedCellPlaceholders(row, span) {
        for (let index = 0; index < span; index += 1) {
            row.push(index === 0 ? "↑M↑" : "←M←");
        }
    }
    function appendHorizontalSpanPlaceholders(row, span) {
        for (let index = 1; index < span; index += 1) {
            row.push("←M←");
        }
    }
    function parseTableRow(rowElement, unsupportedTypes, extractCellText) {
        const row = [];
        for (const cellElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(rowElement, "tc")) || []) {
            const span = getGridSpan(cellElement);
            const verticalMergeState = getVerticalMergeState(cellElement);
            const text = extractCellText(cellElement, unsupportedTypes);
            if (verticalMergeState === "continue") {
                appendMergedCellPlaceholders(row, span);
                continue;
            }
            row.push(text);
            appendHorizontalSpanPlaceholders(row, span);
        }
        return row;
    }
    function parseTableElement(table, extractCellText) {
        const rows = [];
        const unsupportedTypes = [];
        for (const rowElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(table, "tr")) || []) {
            rows.push(parseTableRow(rowElement, unsupportedTypes, extractCellText));
        }
        normalizeRows(rows);
        return {
            kind: "table",
            rows,
            unsupportedTypes: unsupportedTypes.length ? unsupportedTypes : undefined
        };
    }
    moduleRegistry.registerModule("documentTableParser", {
        parseTableElement
    });
})();
