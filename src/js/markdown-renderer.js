/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const imageTrace = moduleRegistry.getModule("imageTrace");
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
        const parsedImageTrace = imageTrace === null || imageTrace === void 0 ? void 0 : imageTrace.parseImageTrace(type);
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
    function appendUnsupportedArtifacts(content, unsupportedTypes, includeUnsupportedComments, options) {
        const placeholders = renderUnsupportedPlaceholders(unsupportedTypes, options);
        const comments = includeUnsupportedComments ? renderUnsupportedComments(unsupportedTypes) : "";
        const withPlaceholders = placeholders ? `${content}\n${placeholders}` : content;
        return comments ? `${withPlaceholders}\n${comments}` : withPlaceholders;
    }
    function renderSupportedBlockContent(block) {
        if (block.kind === "heading") {
            const anchors = renderAnchors(block.anchorIds);
            const headingLine = `${"#".repeat(Math.max(1, Math.min(block.level || 1, 6)))} ${block.text}`;
            return anchors ? `${anchors}\n${headingLine}` : headingLine;
        }
        if (block.kind === "listItem") {
            const indent = "    ".repeat(Math.max(0, block.indent || 0));
            const marker = block.listKind === "ordered" ? "1." : "-";
            const listLine = `${indent}${marker} ${block.text}`;
            const anchors = renderAnchors(block.anchorIds);
            return anchors ? `${anchors}\n${listLine}` : listLine;
        }
        const anchors = renderAnchors(block.anchorIds);
        return anchors ? `${anchors}\n${block.text}` : block.text;
    }
    function renderUnsupportedBlock(block, includeUnsupportedComments, options) {
        const placeholder = renderImagePlaceholder(block.type, options);
        if (includeUnsupportedComments) {
            const comment = renderUnsupportedComment(block.type);
            return placeholder ? `${placeholder}\n${comment}` : comment;
        }
        return placeholder;
    }
    function renderMarkdownBlock(block, includeUnsupportedComments, options) {
        if (block.kind === "table") {
            const table = renderTable(block.rows);
            return appendUnsupportedArtifacts(table, block.unsupportedTypes, includeUnsupportedComments, options);
        }
        if (block.kind === "unsupported") {
            return renderUnsupportedBlock(block, includeUnsupportedComments, options);
        }
        const content = renderSupportedBlockContent(block);
        return appendUnsupportedArtifacts(content, block.unsupportedTypes, includeUnsupportedComments, options);
    }
    function renderMarkdown(parsedDocument, options) {
        const includeUnsupportedComments = !!(options === null || options === void 0 ? void 0 : options.includeUnsupportedComments);
        return parsedDocument.blocks
            .map((block) => renderMarkdownBlock(block, includeUnsupportedComments, options))
            .filter((block) => block !== "")
            .join("\n\n");
    }
    moduleRegistry.registerModule("markdownRenderer", {
        renderMarkdown
    });
})();
