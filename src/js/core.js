/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const zipIo = moduleRegistry.getModule("zipIo");
    const textDecoder = new TextDecoder("utf-8");
    const documentParser = moduleRegistry.getModule("documentParser");
    async function parseDocx(arrayBuffer) {
        const files = await (zipIo === null || zipIo === void 0 ? void 0 : zipIo.unzipEntries(arrayBuffer));
        if (!files) {
            throw new Error("ZIP module is not loaded.");
        }
        const documentXmlBytes = files.get("word/document.xml");
        if (!documentXmlBytes) {
            throw new Error("word/document.xml was not found.");
        }
        const relationshipsBytes = files.get("word/_rels/document.xml.rels");
        const stylesBytes = files.get("word/styles.xml");
        const numberingBytes = files.get("word/numbering.xml");
        const parsedDocument = (documentParser === null || documentParser === void 0 ? void 0 : documentParser.parseDocumentXml(documentXmlBytes, relationshipsBytes, stylesBytes, numberingBytes)) || {
            blocks: [],
            summary: {
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
            }
        };
        const contentTypes = parseContentTypes(files.get("[Content_Types].xml"));
        const assets = collectImageAssets(parsedDocument.blocks, files, contentTypes);
        return {
            ...parsedDocument,
            summary: {
                ...parsedDocument.summary,
                imageAssets: assets.length
            },
            assets
        };
    }
    function parseImageTrace(type) {
        const prefix = "drawing:image(";
        if (!type.startsWith(prefix))
            return null;
        const afterPrefix = type.slice(prefix.length);
        const suffixMarkerIndexes = [
            afterPrefix.indexOf("):alt("),
            afterPrefix.indexOf("):size-emu(")
        ].filter((index) => index >= 0);
        const sourcePathEnd = suffixMarkerIndexes.length > 0
            ? Math.min(...suffixMarkerIndexes)
            : (afterPrefix.endsWith(")") ? afterPrefix.length - 1 : -1);
        if (sourcePathEnd < 0)
            return null;
        const sourcePath = afterPrefix.slice(0, sourcePathEnd);
        if (!sourcePath)
            return null;
        const suffix = afterPrefix.slice(sourcePathEnd + 1);
        let altText = "";
        if (suffix) {
            if (suffix.startsWith(":alt(")) {
                const altAndRest = suffix.slice(":alt(".length);
                const sizeMarkerIndex = altAndRest.lastIndexOf("):size-emu(");
                const altEnd = sizeMarkerIndex >= 0
                    ? sizeMarkerIndex
                    : (altAndRest.endsWith(")") ? altAndRest.length - 1 : -1);
                if (altEnd < 0)
                    return null;
                altText = altAndRest.slice(0, altEnd);
                const rest = altAndRest.slice(altEnd + 1);
                if (rest && !/^:size-emu\([^)]+\)$/.test(rest))
                    return null;
            }
            else if (!/^:size-emu\([^)]+\)$/.test(suffix)) {
                return null;
            }
        }
        return {
            sourcePath,
            altText
        };
    }
    function inferImageMediaType(sourcePath) {
        const normalized = sourcePath.toLowerCase();
        if (normalized.endsWith(".png"))
            return "image/png";
        if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg"))
            return "image/jpeg";
        if (normalized.endsWith(".gif"))
            return "image/gif";
        if (normalized.endsWith(".bmp"))
            return "image/bmp";
        if (normalized.endsWith(".webp"))
            return "image/webp";
        if (normalized.endsWith(".svg"))
            return "image/svg+xml";
        if (normalized.endsWith(".tif") || normalized.endsWith(".tiff"))
            return "image/tiff";
        return "application/octet-stream";
    }
    function normalizePackagePath(filePath) {
        return String(filePath || "").replace(/^\/+/, "");
    }
    function getPathExtension(filePath) {
        const normalized = normalizePackagePath(filePath);
        const lastSegment = normalized.split("/").pop() || "";
        const extensionIndex = lastSegment.lastIndexOf(".");
        if (extensionIndex < 0)
            return "";
        return lastSegment.slice(extensionIndex + 1).toLowerCase();
    }
    function parseContentTypes(contentTypesBytes) {
        const parsed = {
            defaults: new Map(),
            overrides: new Map()
        };
        if (!contentTypesBytes || typeof DOMParser !== "function") {
            return parsed;
        }
        const xml = textDecoder.decode(contentTypesBytes);
        const document = new DOMParser().parseFromString(xml, "application/xml");
        const defaultElements = Array.from(document.getElementsByTagName("Default"));
        const overrideElements = Array.from(document.getElementsByTagName("Override"));
        for (const element of defaultElements) {
            const extension = (element.getAttribute("Extension") || "").trim().toLowerCase();
            const contentType = (element.getAttribute("ContentType") || "").trim();
            if (!extension || !contentType)
                continue;
            parsed.defaults.set(extension, contentType);
        }
        for (const element of overrideElements) {
            const partName = normalizePackagePath((element.getAttribute("PartName") || "").trim());
            const contentType = (element.getAttribute("ContentType") || "").trim();
            if (!partName || !contentType)
                continue;
            parsed.overrides.set(partName, contentType);
        }
        return parsed;
    }
    function resolveImageMediaType(sourcePath, contentTypes) {
        const normalizedSourcePath = normalizePackagePath(sourcePath);
        const overrideType = contentTypes.overrides.get(normalizedSourcePath);
        if (overrideType)
            return overrideType;
        const extensionType = contentTypes.defaults.get(getPathExtension(normalizedSourcePath));
        if (extensionType)
            return extensionType;
        return inferImageMediaType(normalizedSourcePath);
    }
    function collectImageAssets(blocks, files, contentTypes) {
        const assets = [];
        const seen = new Set();
        for (const [blockIndex, block] of blocks.entries()) {
            const traceTypes = block.kind === "unsupported"
                ? [block.type]
                : (block.unsupportedTypes || []);
            for (const [traceIndex, traceType] of traceTypes.entries()) {
                const parsedTrace = parseImageTrace(traceType);
                if (!parsedTrace)
                    continue;
                if (seen.has(parsedTrace.sourcePath))
                    continue;
                const bytes = files.get(parsedTrace.sourcePath);
                if (!bytes)
                    continue;
                seen.add(parsedTrace.sourcePath);
                assets.push({
                    kind: "image",
                    sourcePath: parsedTrace.sourcePath,
                    mediaType: resolveImageMediaType(parsedTrace.sourcePath, contentTypes),
                    altText: parsedTrace.altText,
                    sourceTrace: traceType,
                    blockIndex,
                    documentPosition: {
                        blockIndex,
                        blockKind: block.kind,
                        traceIndex
                    },
                    bytes
                });
            }
        }
        return assets;
    }
    function escapeTableCell(text) {
        return String(text || "").replace(/\|/g, "\\|");
    }
    function renderTable(rows) {
        if (!rows.length)
            return "";
        const header = rows[0];
        const separator = header.map(() => "---");
        const bodyRows = rows.slice(1);
        return [
            `| ${header.map((cell) => escapeTableCell(cell)).join(" | ")} |`,
            `| ${separator.join(" | ")} |`,
            ...bodyRows.map((row) => `| ${row.map((cell) => escapeTableCell(cell)).join(" | ")} |`)
        ].join("\n");
    }
    function renderAnchors(anchorIds) {
        if (!anchorIds || anchorIds.length === 0)
            return "";
        return anchorIds.map((anchorId) => `<a id="${String(anchorId)}"></a>`).join("\n");
    }
    function escapeHtmlCommentText(text) {
        return String(text || "")
            .replace(/--/g, "- -")
            .replace(/>/g, "&gt;");
    }
    function renderUnsupportedComment(type) {
        return `<!-- unsupported: ${escapeHtmlCommentText(type)} -->`;
    }
    function renderUnsupportedComments(unsupportedTypes) {
        if (!unsupportedTypes || unsupportedTypes.length === 0)
            return "";
        return unsupportedTypes.map((type) => renderUnsupportedComment(type)).join("\n");
    }
    function escapeMarkdownImageAltText(text) {
        return String(text || "")
            .replace(/\s+/g, " ")
            .replace(/[\[\]]/g, "")
            .trim();
    }
    function formatImagePlaceholderAltText(text) {
        return String(text || "").replace(/\s+/g, " ").trim();
    }
    function escapeMarkdownLinkDestination(destination) {
        return String(destination || "")
            .replace(/%/g, "%25")
            .replace(/\s/g, (match) => encodeURIComponent(match))
            .replace(/\(/g, "%28")
            .replace(/\)/g, "%29")
            .replace(/</g, "%3C")
            .replace(/>/g, "%3E");
    }
    function renderImagePlaceholder(type, options) {
        var _a;
        const parsedImageTrace = parseImageTrace(type);
        if (!parsedImageTrace || !parsedImageTrace.altText)
            return "";
        const resolvedPath = ((_a = options === null || options === void 0 ? void 0 : options.imagePathResolver) === null || _a === void 0 ? void 0 : _a.call(options, parsedImageTrace.sourcePath)) || "";
        if (resolvedPath) {
            return `![${escapeMarkdownImageAltText(parsedImageTrace.altText)}](${escapeMarkdownLinkDestination(resolvedPath)})`;
        }
        return `[Image: ${formatImagePlaceholderAltText(parsedImageTrace.altText)}]`;
    }
    function renderUnsupportedPlaceholders(unsupportedTypes, options) {
        if (!unsupportedTypes || unsupportedTypes.length === 0)
            return "";
        return unsupportedTypes
            .map((type) => renderImagePlaceholder(type, options))
            .filter((text) => text !== "")
            .join("\n");
    }
    function renderMarkdown(parsedDocument, options) {
        const includeUnsupportedComments = !!(options === null || options === void 0 ? void 0 : options.includeUnsupportedComments);
        return parsedDocument.blocks
            .map((block) => {
            if (block.kind === "table") {
                const table = renderTable(block.rows);
                const placeholders = renderUnsupportedPlaceholders(block.unsupportedTypes, options);
                const comments = includeUnsupportedComments ? renderUnsupportedComments(block.unsupportedTypes) : "";
                const withPlaceholders = placeholders ? `${table}\n${placeholders}` : table;
                return comments ? `${withPlaceholders}\n${comments}` : withPlaceholders;
            }
            if (block.kind === "unsupported") {
                const placeholder = renderImagePlaceholder(block.type, options);
                if (includeUnsupportedComments) {
                    const comment = renderUnsupportedComment(block.type);
                    return placeholder ? `${placeholder}\n${comment}` : comment;
                }
                return placeholder;
            }
            if (block.kind === "heading") {
                const anchors = renderAnchors(block.anchorIds);
                const headingLine = `${"#".repeat(Math.max(1, Math.min(block.level || 1, 6)))} ${block.text}`;
                const content = anchors ? `${anchors}\n${headingLine}` : headingLine;
                const placeholders = renderUnsupportedPlaceholders(block.unsupportedTypes, options);
                const comments = includeUnsupportedComments ? renderUnsupportedComments(block.unsupportedTypes) : "";
                const withPlaceholders = placeholders ? `${content}\n${placeholders}` : content;
                return comments ? `${withPlaceholders}\n${comments}` : withPlaceholders;
            }
            if (block.kind === "listItem") {
                const indent = "    ".repeat(Math.max(0, block.indent || 0));
                const marker = block.listKind === "ordered" ? "1." : "-";
                const listLine = `${indent}${marker} ${block.text}`;
                const anchors = renderAnchors(block.anchorIds);
                const content = anchors ? `${anchors}\n${listLine}` : listLine;
                const placeholders = renderUnsupportedPlaceholders(block.unsupportedTypes, options);
                const comments = includeUnsupportedComments ? renderUnsupportedComments(block.unsupportedTypes) : "";
                const withPlaceholders = placeholders ? `${content}\n${placeholders}` : content;
                return comments ? `${withPlaceholders}\n${comments}` : withPlaceholders;
            }
            const anchors = renderAnchors(block.anchorIds);
            const content = anchors ? `${anchors}\n${block.text}` : block.text;
            const placeholders = renderUnsupportedPlaceholders(block.unsupportedTypes, options);
            const comments = includeUnsupportedComments ? renderUnsupportedComments(block.unsupportedTypes) : "";
            const withPlaceholders = placeholders ? `${content}\n${placeholders}` : content;
            return comments ? `${withPlaceholders}\n${comments}` : withPlaceholders;
        })
            .filter((block) => block !== "")
            .join("\n\n");
    }
    function createSummary(parsedDocument) {
        return {
            ...parsedDocument.summary
        };
    }
    function createSummaryText(parsedDocument) {
        const summary = createSummary(parsedDocument);
        return [
            `paragraphs: ${summary.paragraphs}`,
            `headings: ${summary.headings}`,
            `listItems: ${summary.listItems}`,
            `tables: ${summary.tables}`,
            `images: ${summary.images}`,
            `imageAssets: ${summary.imageAssets}`,
            `drawingLikeUnsupported: ${summary.drawingLikeUnsupported}`,
            `links: ${summary.links}`,
            `internalLinks: ${summary.internalLinks}`,
            `externalLinks: ${summary.externalLinks}`,
            `unsupportedElements: ${summary.unsupportedElements}`,
            `unsupportedCommentTraces: ${summary.unsupportedCommentTraces}`
        ].join("\n");
    }
    function createAssetsManifestText(parsedDocument) {
        return JSON.stringify({
            version: 1,
            assets: (parsedDocument.assets || []).map((asset) => ({
                kind: asset.kind,
                sourcePath: asset.sourcePath,
                mediaType: asset.mediaType,
                altText: asset.altText,
                sourceTrace: asset.sourceTrace,
                blockIndex: asset.blockIndex,
                documentPosition: asset.documentPosition,
                size: asset.bytes.length
            }))
        }, null, 2);
    }
    moduleRegistry.registerModule("docx2md", {
        parseDocx,
        renderMarkdown,
        createSummary,
        createSummaryText,
        createAssetsManifestText
    });
})();
