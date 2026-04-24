/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const documentDrawingParser = moduleRegistry.getModule("documentDrawingParser");
    const documentAnchorParser = moduleRegistry.getModule("documentAnchorParser");
    const documentTableParser = moduleRegistry.getModule("documentTableParser");
    const documentCellParser = moduleRegistry.getModule("documentCellParser");
    const documentInlineParser = moduleRegistry.getModule("documentInlineParser");
    const documentParagraphParser = moduleRegistry.getModule("documentParagraphParser");
    const documentSummary = moduleRegistry.getModule("documentSummary");
    function recordUnsupported(context, type) {
        documentSummary === null || documentSummary === void 0 ? void 0 : documentSummary.recordUnsupportedSummary(context.summary, type);
        return {
            kind: "unsupported",
            type
        };
    }
    function describeUnsupportedElement(element, relationships) {
        return (documentDrawingParser === null || documentDrawingParser === void 0 ? void 0 : documentDrawingParser.describeUnsupportedElement(element, relationships))
            || (element.localName || "unknown");
    }
    function extractParagraphAnchors(paragraph) {
        return (documentAnchorParser === null || documentAnchorParser === void 0 ? void 0 : documentAnchorParser.extractParagraphAnchors(paragraph)) || [];
    }
    function claimUniqueAnchorIds(anchorIds, emittedAnchorIds) {
        return (documentAnchorParser === null || documentAnchorParser === void 0 ? void 0 : documentAnchorParser.claimUniqueAnchorIds(anchorIds, emittedAnchorIds)) || [];
    }
    function getHeadingLevel(paragraph, styles) {
        return (documentParagraphParser === null || documentParagraphParser === void 0 ? void 0 : documentParagraphParser.getHeadingLevel(paragraph, styles)) || null;
    }
    function getListMetadata(paragraph, numbering) {
        return (documentParagraphParser === null || documentParagraphParser === void 0 ? void 0 : documentParagraphParser.getListMetadata(paragraph, numbering)) || null;
    }
    function renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes) {
        return (documentParagraphParser === null || documentParagraphParser === void 0 ? void 0 : documentParagraphParser.renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes)) || text;
    }
    function requireDocumentSummary() {
        if (!documentSummary) {
            throw new Error("DOCX document summary module is not loaded.");
        }
        return documentSummary;
    }
    function parseTableElement(table, relationships, styles, numbering, context) {
        return (documentTableParser === null || documentTableParser === void 0 ? void 0 : documentTableParser.parseTableElement(table, (cell, tableUnsupportedTypes) => (documentCellParser === null || documentCellParser === void 0 ? void 0 : documentCellParser.extractCellText(cell, relationships, styles, numbering, context, tableUnsupportedTypes)) || "")) || { kind: "table", rows: [] };
    }
    function collectKnownAnchorIds(body) {
        const knownAnchorIds = new Set();
        for (const paragraphElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(body, "p")) || []) {
            for (const anchorId of extractParagraphAnchors(paragraphElement)) {
                knownAnchorIds.add(anchorId);
            }
        }
        return knownAnchorIds;
    }
    function parseParagraphBlock(element, relationships, styles, numbering, context, emittedAnchorIds) {
        const unsupportedTypes = [];
        const text = (documentInlineParser === null || documentInlineParser === void 0 ? void 0 : documentInlineParser.extractTextRuns(element, relationships, styles, numbering, context, unsupportedTypes, renderStructuredParagraphText, documentInlineParser.getParagraphTextStyle(element, styles))) || "";
        const level = getHeadingLevel(element, styles);
        const listMetadata = getListMetadata(element, numbering);
        if (!text)
            return null;
        const anchorIds = claimUniqueAnchorIds(extractParagraphAnchors(element), emittedAnchorIds);
        if (listMetadata) {
            context.summary.listItems += 1;
        }
        else if (level) {
            context.summary.headings += 1;
        }
        else {
            context.summary.paragraphs += 1;
        }
        return {
            kind: listMetadata ? "listItem" : (level ? "heading" : "paragraph"),
            text,
            level: level || undefined,
            listKind: listMetadata === null || listMetadata === void 0 ? void 0 : listMetadata.listKind,
            indent: listMetadata === null || listMetadata === void 0 ? void 0 : listMetadata.indent,
            anchorIds,
            unsupportedTypes: unsupportedTypes.length ? unsupportedTypes : undefined
        };
    }
    function parseBodyElement(element, relationships, styles, numbering, context, emittedAnchorIds) {
        if (element.localName === "p") {
            return parseParagraphBlock(element, relationships, styles, numbering, context, emittedAnchorIds);
        }
        if (element.localName === "tbl") {
            context.summary.tables += 1;
            return parseTableElement(element, relationships, styles, numbering, context);
        }
        return recordUnsupported(context, describeUnsupportedElement(element, relationships));
    }
    function parseDocumentBody(body, relationships, styles, numbering) {
        const summary = requireDocumentSummary().createEmptySummary();
        const blocks = [];
        if (!body) {
            return { blocks, summary };
        }
        const emittedAnchorIds = new Set();
        const context = {
            summary,
            knownAnchorIds: collectKnownAnchorIds(body)
        };
        for (const child of Array.from(body.childNodes || [])) {
            if (child.nodeType !== 1)
                continue;
            const element = child;
            const block = parseBodyElement(element, relationships, styles, numbering, context, emittedAnchorIds);
            if (block) {
                blocks.push(block);
            }
        }
        return { blocks, summary };
    }
    moduleRegistry.registerModule("documentBlockParser", {
        parseDocumentBody
    });
})();
