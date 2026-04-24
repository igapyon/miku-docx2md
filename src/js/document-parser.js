/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const relsParser = moduleRegistry.getModule("relsParser");
    const stylesParser = moduleRegistry.getModule("stylesParser");
    const numberingParser = moduleRegistry.getModule("numberingParser");
    function hasEnabledElement(parent, localName) {
        if (!parent)
            return false;
        const element = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(parent, localName)[0]) || null;
        if (!element)
            return false;
        const value = element.getAttribute("w:val") || element.getAttribute("val") || "";
        return value !== "false" && value !== "0";
    }
    function readStyleValue(parent, localName) {
        if (!parent)
            return null;
        const element = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(parent, localName)[0]) || null;
        if (!element)
            return null;
        const value = element.getAttribute("w:val") || element.getAttribute("val") || "";
        if (!value)
            return true;
        return value !== "false" && value !== "0";
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
    function mergeStyle(base, override) {
        return {
            bold: base.bold || override.bold,
            italic: base.italic || override.italic,
            strike: base.strike || override.strike,
            underline: base.underline || override.underline
        };
    }
    function applyStyleOverride(base, override) {
        return {
            bold: override.bold === null ? base.bold : override.bold,
            italic: override.italic === null ? base.italic : override.italic,
            strike: override.strike === null ? base.strike : override.strike,
            underline: override.underline === null ? base.underline : override.underline
        };
    }
    function emptyStyle() {
        return {
            bold: false,
            italic: false,
            strike: false,
            underline: false
        };
    }
    function readRunStyle(runElement) {
        const properties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(runElement, "rPr")[0]) || null;
        return {
            bold: hasEnabledElement(properties, "b"),
            italic: hasEnabledElement(properties, "i"),
            strike: hasEnabledElement(properties, "strike"),
            underline: hasEnabledElement(properties, "u")
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
        const paragraphStyleId = (paragraphStyleElement === null || paragraphStyleElement === void 0 ? void 0 : paragraphStyleElement.getAttribute("w:val")) || (paragraphStyleElement === null || paragraphStyleElement === void 0 ? void 0 : paragraphStyleElement.getAttribute("val")) || "";
        const styleFromParagraphStyle = applyStyleOverride(emptyStyle(), resolveTextStyleOverrideFromStyleId(styles, paragraphStyleId, "paragraph"));
        const paragraphRunProperties = paragraphProperties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "rPr")[0]) || null) : null;
        return applyStyleOverride(styleFromParagraphStyle, readStyleOverrideFromRunProperties(paragraphRunProperties));
    }
    function normalizeInlineText(text) {
        return text.replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
    }
    function recordUnsupported(context, type) {
        if (type.startsWith("drawing")) {
            context.summary.drawingLikeUnsupported += 1;
        }
        if (type.startsWith("drawing:image(")) {
            context.summary.images += 1;
        }
        context.summary.unsupportedElements += 1;
        context.summary.unsupportedCommentTraces += 1;
        return {
            kind: "unsupported",
            type
        };
    }
    function recordUnsupportedTrace(context, traces, type) {
        if (type.startsWith("drawing")) {
            context.summary.drawingLikeUnsupported += 1;
        }
        if (type.startsWith("drawing:image(")) {
            context.summary.images += 1;
        }
        context.summary.unsupportedElements += 1;
        context.summary.unsupportedCommentTraces += 1;
        traces.push(type);
    }
    function classifyUnsupportedType(localName) {
        switch (localName) {
            case "drawing":
            case "pict":
            case "object":
                return "drawing";
            case "txbxContent":
            case "textbox":
            case "textBox":
                return "textbox";
            case "chart":
                return "chart";
            default:
                return localName || "unknown";
        }
    }
    function resolveImageTargetFromUnsupportedElement(element, relationships) {
        const blips = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(element, "blip")) || [];
        for (const blip of blips) {
            const relationshipId = blip.getAttribute("r:embed") || blip.getAttribute("embed") || "";
            if (!relationshipId)
                continue;
            const relationship = relationships.get(relationshipId);
            if (!relationship)
                continue;
            if (relationship.type.includes("/image")) {
                return relationship.target;
            }
        }
        return "";
    }
    function resolveImageAltTextFromUnsupportedElement(element) {
        const metadataElements = [
            ...((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(element, "docPr")) || []),
            ...((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(element, "cNvPr")) || [])
        ];
        for (const metadataElement of metadataElements) {
            const description = (metadataElement.getAttribute("descr") || "").trim();
            if (description)
                return description;
            const title = (metadataElement.getAttribute("title") || "").trim();
            if (title)
                return title;
        }
        return "";
    }
    function resolveImageExtentFromUnsupportedElement(element) {
        const extentElements = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(element, "extent")) || [];
        for (const extentElement of extentElements) {
            const cx = (extentElement.getAttribute("cx") || "").trim();
            const cy = (extentElement.getAttribute("cy") || "").trim();
            if (cx && cy) {
                return `${cx}x${cy}`;
            }
        }
        return "";
    }
    function describeUnsupportedElement(element, relationships) {
        const type = classifyUnsupportedType(element.localName || "unknown");
        if (type === "drawing") {
            const imageTarget = resolveImageTargetFromUnsupportedElement(element, relationships);
            const imageAltText = resolveImageAltTextFromUnsupportedElement(element);
            const imageExtent = resolveImageExtentFromUnsupportedElement(element);
            if (imageTarget) {
                const parts = [`drawing:image(${imageTarget})`];
                if (imageAltText) {
                    parts.push(`alt(${imageAltText})`);
                }
                if (imageExtent) {
                    parts.push(`size-emu(${imageExtent})`);
                }
                return parts.join(":");
            }
        }
        return type;
    }
    function normalizeAnchorName(name) {
        const normalized = String(name || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9._:-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^[-:.]+|[-:.]+$/g, "");
        return normalized;
    }
    function extractParagraphAnchors(paragraph) {
        const anchors = [];
        const bookmarks = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(paragraph, "bookmarkStart")) || [];
        for (const bookmark of bookmarks) {
            const rawName = (bookmark.getAttribute("w:name") || bookmark.getAttribute("name") || "").trim();
            if (!rawName || rawName.startsWith("_"))
                continue;
            const normalizedName = normalizeAnchorName(rawName);
            if (!normalizedName)
                continue;
            if (!anchors.includes(normalizedName)) {
                anchors.push(normalizedName);
            }
        }
        return anchors;
    }
    function normalizeRelationshipAnchorTarget(target) {
        const normalizedTarget = String(target || "").trim();
        if (!normalizedTarget)
            return "";
        if (normalizedTarget.startsWith("#")) {
            return normalizeAnchorName(normalizedTarget.slice(1));
        }
        const fragmentIndex = normalizedTarget.indexOf("#");
        if (fragmentIndex < 0)
            return "";
        const targetPath = normalizedTarget.slice(0, fragmentIndex);
        if (targetPath && targetPath !== "word/document.xml")
            return "";
        return normalizeAnchorName(normalizedTarget.slice(fragmentIndex + 1));
    }
    function claimUniqueAnchorIds(anchorIds, emittedAnchorIds) {
        const uniqueAnchorIds = [];
        for (const anchorId of anchorIds) {
            if (emittedAnchorIds.has(anchorId))
                continue;
            emittedAnchorIds.add(anchorId);
            uniqueAnchorIds.push(anchorId);
        }
        return uniqueAnchorIds;
    }
    function extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, inheritedStyle = emptyStyle(), suppressUnderline = false) {
        const pieces = [];
        for (const child of Array.from(paragraph.childNodes || [])) {
            if (child.nodeType !== 1)
                continue;
            const element = child;
            if (element.localName === "r") {
                const properties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(element, "rPr")[0]) || null;
                const runStyleElement = properties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(properties, "rStyle")[0]) || null) : null;
                const runStyleId = (runStyleElement === null || runStyleElement === void 0 ? void 0 : runStyleElement.getAttribute("w:val")) || (runStyleElement === null || runStyleElement === void 0 ? void 0 : runStyleElement.getAttribute("val")) || "";
                const styleFromRunStyle = resolveTextStyleOverrideFromStyleId(styles, runStyleId, "character");
                const style = applyStyleOverride(applyStyleOverride(inheritedStyle, styleFromRunStyle), readStyleOverrideFromRunProperties(properties));
                const effectiveStyle = suppressUnderline ? { ...style, underline: false } : style;
                const textElements = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(element, "t")) || [];
                for (const textElement of textElements) {
                    pieces.push(applyTextStyle((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getTextContent(textElement)) || "", effectiveStyle));
                }
                const breakElements = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(element, "br")) || [];
                if (breakElements.length > 0) {
                    pieces.push("<br>".repeat(breakElements.length));
                }
            }
            else if (element.localName === "txbxContent") {
                const textboxText = extractTextboxText(element, relationships, styles, numbering, context, unsupportedTypes);
                if (textboxText) {
                    if (pieces.length > 0) {
                        pieces.push("<br><br>");
                    }
                    pieces.push(textboxText);
                }
            }
            else if (element.localName === "hyperlink") {
                const linkText = extractTextRuns(element, relationships, styles, numbering, context, unsupportedTypes, inheritedStyle, true);
                const relationshipId = element.getAttribute("r:id") || "";
                const anchor = normalizeAnchorName(element.getAttribute("w:anchor") || element.getAttribute("anchor") || "");
                const relationship = relationshipId ? relationships.get(relationshipId) || null : null;
                const relationshipAnchor = relationship ? normalizeRelationshipAnchorTarget(relationship.target) : "";
                if ((relationship === null || relationship === void 0 ? void 0 : relationship.mode) === "External") {
                    context.summary.links += 1;
                    context.summary.externalLinks += 1;
                    pieces.push(`[${linkText}](${relationship.target})`);
                }
                else if (relationshipAnchor && context.knownAnchorIds.has(relationshipAnchor)) {
                    context.summary.links += 1;
                    context.summary.internalLinks += 1;
                    pieces.push(`[${linkText}](#${relationshipAnchor})`);
                }
                else if (anchor && context.knownAnchorIds.has(anchor)) {
                    context.summary.links += 1;
                    context.summary.internalLinks += 1;
                    pieces.push(`[${linkText}](#${anchor})`);
                }
                else {
                    pieces.push(linkText);
                }
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
    function isHeadingName(name) {
        const match = /^(Heading|見出し)\s*([1-6])$/i.exec(name.trim());
        if (!match)
            return null;
        return Number.parseInt(match[2], 10);
    }
    function getHeadingLevel(paragraph, styles) {
        const paragraphProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraph, "pPr")[0]) || null;
        if (!paragraphProperties)
            return null;
        const paragraphStyle = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "pStyle")[0]) || null;
        const styleId = (paragraphStyle === null || paragraphStyle === void 0 ? void 0 : paragraphStyle.getAttribute("w:val")) || (paragraphStyle === null || paragraphStyle === void 0 ? void 0 : paragraphStyle.getAttribute("val")) || "";
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
        const outlineLevel = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "outlineLvl")[0]) || null;
        const value = (outlineLevel === null || outlineLevel === void 0 ? void 0 : outlineLevel.getAttribute("w:val")) || (outlineLevel === null || outlineLevel === void 0 ? void 0 : outlineLevel.getAttribute("val")) || "";
        const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
        return Number.isFinite(parsed) ? Math.min(parsed + 1, 6) : null;
    }
    function getListMetadata(paragraph, numbering) {
        const paragraphProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraph, "pPr")[0]) || null;
        if (!paragraphProperties)
            return null;
        const numberingProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(paragraphProperties, "numPr")[0]) || null;
        if (!numberingProperties)
            return null;
        const numIdElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(numberingProperties, "numId")[0]) || null;
        const ilvlElement = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(numberingProperties, "ilvl")[0]) || null;
        const numId = (numIdElement === null || numIdElement === void 0 ? void 0 : numIdElement.getAttribute("w:val")) || (numIdElement === null || numIdElement === void 0 ? void 0 : numIdElement.getAttribute("val")) || "";
        const indent = Number.parseInt((ilvlElement === null || ilvlElement === void 0 ? void 0 : ilvlElement.getAttribute("w:val")) || (ilvlElement === null || ilvlElement === void 0 ? void 0 : ilvlElement.getAttribute("val")) || "0", 10);
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
    function getGridSpan(cell) {
        const cellProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cell, "tcPr")[0]) || null;
        const gridSpan = cellProperties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cellProperties, "gridSpan")[0]) || null) : null;
        const value = (gridSpan === null || gridSpan === void 0 ? void 0 : gridSpan.getAttribute("w:val")) || (gridSpan === null || gridSpan === void 0 ? void 0 : gridSpan.getAttribute("val")) || "1";
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }
    function getVerticalMergeState(cell) {
        const cellProperties = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cell, "tcPr")[0]) || null;
        const verticalMerge = cellProperties ? ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cellProperties, "vMerge")[0]) || null) : null;
        if (!verticalMerge)
            return null;
        const value = verticalMerge.getAttribute("w:val") || verticalMerge.getAttribute("val") || "";
        if (!value || value === "continue")
            return "continue";
        if (value === "restart")
            return "restart";
        return null;
    }
    function extractCellText(cell, relationships, styles, numbering, context, tableUnsupportedTypes) {
        const paragraphs = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(cell, "p")) || [];
        const parts = paragraphs
            .map((paragraph) => renderCellParagraph(paragraph, relationships, styles, numbering, context, tableUnsupportedTypes))
            .filter((text) => !!text);
        return parts.join("<br><br>").trim();
    }
    function renderCellParagraph(paragraph, relationships, styles, numbering, context, unsupportedTypes) {
        const text = extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, getParagraphTextStyle(paragraph, styles));
        if (!text)
            return "";
        return renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes);
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
    function extractTextboxText(textboxContent, relationships, styles, numbering, context, unsupportedTypes) {
        const paragraphs = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(textboxContent, "p")) || [];
        const parts = paragraphs
            .map((paragraph) => {
            const text = extractTextRuns(paragraph, relationships, styles, numbering, context, unsupportedTypes, getParagraphTextStyle(paragraph, styles));
            if (!text)
                return "";
            return renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes);
        })
            .filter((text) => !!text);
        return parts.join("<br><br>").trim();
    }
    function parseTableElement(table, relationships, styles, numbering, context) {
        const rows = [];
        const unsupportedTypes = [];
        for (const rowElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(table, "tr")) || []) {
            const row = [];
            for (const cellElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(rowElement, "tc")) || []) {
                const span = getGridSpan(cellElement);
                const verticalMergeState = getVerticalMergeState(cellElement);
                const text = extractCellText(cellElement, relationships, styles, numbering, context, unsupportedTypes);
                if (verticalMergeState === "continue") {
                    for (let index = 0; index < span; index += 1) {
                        row.push(index === 0 ? "↑M↑" : "←M←");
                    }
                    continue;
                }
                row.push(text);
                for (let index = 1; index < span; index += 1) {
                    row.push("←M←");
                }
            }
            rows.push(row);
        }
        const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
        for (const row of rows) {
            while (row.length < columnCount) {
                row.push("");
            }
        }
        return {
            kind: "table",
            rows,
            unsupportedTypes: unsupportedTypes.length ? unsupportedTypes : undefined
        };
    }
    function parseDocumentXml(documentXmlBytes, relationshipsBytes, stylesBytes, numberingBytes) {
        const document = xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.parseXml(documentXmlBytes);
        const body = document ? xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(document, "body")[0] : null;
        const relationships = relationshipsBytes ? (relsParser === null || relsParser === void 0 ? void 0 : relsParser.parseRelationships(relationshipsBytes, "word/document.xml")) || new Map() : new Map();
        const styles = (stylesParser === null || stylesParser === void 0 ? void 0 : stylesParser.parseStyles(stylesBytes)) || new Map();
        const numbering = (numberingParser === null || numberingParser === void 0 ? void 0 : numberingParser.parseNumbering(numberingBytes)) || { abstractNums: new Map(), nums: new Map() };
        const summary = {
            paragraphs: 0,
            headings: 0,
            listItems: 0,
            tables: 0,
            images: 0,
            imageAssets: 0,
            drawingLikeUnsupported: 0,
            links: 0,
            internalLinks: 0,
            externalLinks: 0,
            unsupportedElements: 0,
            unsupportedCommentTraces: 0
        };
        const blocks = [];
        if (!body) {
            return { blocks, summary };
        }
        const knownAnchorIds = new Set();
        for (const paragraphElement of (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getChildrenByLocalName(body, "p")) || []) {
            for (const anchorId of extractParagraphAnchors(paragraphElement)) {
                knownAnchorIds.add(anchorId);
            }
        }
        const emittedAnchorIds = new Set();
        const context = { summary, knownAnchorIds };
        for (const child of Array.from(body.childNodes || [])) {
            if (child.nodeType !== 1)
                continue;
            const element = child;
            if (element.localName === "p") {
                const unsupportedTypes = [];
                const text = extractTextRuns(element, relationships, styles, numbering, context, unsupportedTypes, getParagraphTextStyle(element, styles));
                const level = getHeadingLevel(element, styles);
                const listMetadata = getListMetadata(element, numbering);
                if (text) {
                    const anchorIds = claimUniqueAnchorIds(extractParagraphAnchors(element), emittedAnchorIds);
                    if (listMetadata) {
                        summary.listItems += 1;
                    }
                    else if (level) {
                        summary.headings += 1;
                    }
                    else {
                        summary.paragraphs += 1;
                    }
                    blocks.push({
                        kind: listMetadata ? "listItem" : (level ? "heading" : "paragraph"),
                        text,
                        level: level || undefined,
                        listKind: listMetadata === null || listMetadata === void 0 ? void 0 : listMetadata.listKind,
                        indent: listMetadata === null || listMetadata === void 0 ? void 0 : listMetadata.indent,
                        anchorIds,
                        unsupportedTypes: unsupportedTypes.length ? unsupportedTypes : undefined
                    });
                }
            }
            else if (element.localName === "tbl") {
                summary.tables += 1;
                blocks.push(parseTableElement(element, relationships, styles, numbering, context));
            }
            else {
                blocks.push(recordUnsupported(context, describeUnsupportedElement(element, relationships)));
            }
        }
        return { blocks, summary };
    }
    moduleRegistry.registerModule("documentParser", {
        parseDocumentXml
    });
})();
