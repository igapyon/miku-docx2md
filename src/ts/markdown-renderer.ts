/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const imageTrace = moduleRegistry.getModule<{
    parseImageTrace: (type: string) => { sourcePath: string; altText: string } | null;
  }>("imageTrace");

  type SupportedMarkdownBlock = Extract<Docx2mdParsedBlock, { kind: "paragraph" | "heading" | "listItem" }>;

  function escapeTableCell(text: string): string {
    return String(text || "").replace(/\|/g, "\\|");
  }

  function quoteYamlString(value: string): string {
    return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
  }

  function createFrontMatter(options?: Docx2mdMarkdownRenderOptions): string {
    return [
      "---",
      `title: ${quoteYamlString(String(options?.title || "document.docx"))}`,
      "type: converted",
      "conversion:",
      "  tool: miku-docx2md",
      `  version: ${quoteYamlString(String(options?.toolVersion || "unknown"))}`,
      `  unsupported_comments: ${options?.includeUnsupportedComments ? "include" : "exclude"}`,
      "---"
    ].join("\n");
  }

  function shouldIncludeFrontMatter(options?: Docx2mdMarkdownRenderOptions): boolean {
    return String(options?.frontMatter || "exclude") !== "exclude";
  }

  function renderTable(rows: string[][]): string {
    if (!rows.length) return "";
    const header = rows[0];
    const separator = header.map(() => "---");
    const bodyRows = rows.slice(1);
    return [
      `| ${header.map((cell) => escapeTableCell(cell)).join(" | ")} |`,
      `| ${separator.join(" | ")} |`,
      ...bodyRows.map((row) => `| ${row.map((cell) => escapeTableCell(cell)).join(" | ")} |`)
    ].join("\n");
  }

  function renderAnchors(anchorIds?: string[]): string {
    if (!anchorIds || anchorIds.length === 0) return "";
    return anchorIds.map((anchorId) => `<a id="${String(anchorId)}"></a>`).join("\n");
  }

  function escapeHtmlCommentText(text: string): string {
    return String(text || "")
      .replace(/--/g, "- -")
      .replace(/>/g, "&gt;");
  }

  function renderUnsupportedComment(type: string): string {
    return `<!-- unsupported: ${escapeHtmlCommentText(type)} -->`;
  }

  function renderUnsupportedComments(unsupportedTypes?: string[]): string {
    if (!unsupportedTypes || unsupportedTypes.length === 0) return "";
    return unsupportedTypes.map((type) => renderUnsupportedComment(type)).join("\n");
  }

  function escapeMarkdownImageAltText(text: string): string {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/[\[\]]/g, "")
      .trim();
  }

  function formatImagePlaceholderAltText(text: string): string {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function escapeMarkdownLinkDestination(destination: string): string {
    return String(destination || "")
      .replace(/%/g, "%25")
      .replace(/\s/g, (match) => encodeURIComponent(match))
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/</g, "%3C")
      .replace(/>/g, "%3E");
  }

  function renderImagePlaceholder(
    type: string,
    options?: Docx2mdMarkdownRenderOptions
  ): string {
    const parsedImageTrace = imageTrace?.parseImageTrace(type);
    if (!parsedImageTrace) return "";
    const resolvedPath = options?.imagePathResolver?.(parsedImageTrace.sourcePath) || "";
    if (resolvedPath) {
      return `![${escapeMarkdownImageAltText(parsedImageTrace.altText)}](${escapeMarkdownLinkDestination(resolvedPath)})`;
    }
    if (!parsedImageTrace.altText) return "";
    return `[Image: ${formatImagePlaceholderAltText(parsedImageTrace.altText)}]`;
  }

  function renderUnsupportedPlaceholders(
    unsupportedTypes?: string[],
    options?: Docx2mdMarkdownRenderOptions
  ): string {
    if (!unsupportedTypes || unsupportedTypes.length === 0) return "";
    return unsupportedTypes
      .map((type) => renderImagePlaceholder(type, options))
      .filter((text) => text !== "")
      .join("\n");
  }

  function appendUnsupportedArtifacts(
    content: string,
    unsupportedTypes: string[] | undefined,
    includeUnsupportedComments: boolean,
    options?: Docx2mdMarkdownRenderOptions
  ): string {
    const placeholders = renderUnsupportedPlaceholders(unsupportedTypes, options);
    const comments = includeUnsupportedComments ? renderUnsupportedComments(unsupportedTypes) : "";
    const withPlaceholders = placeholders ? `${content}\n${placeholders}` : content;
    return comments ? `${withPlaceholders}\n${comments}` : withPlaceholders;
  }

  function renderCommentFootnotes(comments?: Docx2mdParsedComment[]): string {
    if (!comments || comments.length === 0) return "";
    return comments
      .map((comment) => `[^${comment.label}]: ${String(comment.text || "").trim()}`)
      .filter((definition) => !definition.endsWith(": "))
      .join("\n");
  }

  function renderSupportedBlockContent(block: SupportedMarkdownBlock): string {
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

  function renderUnsupportedBlock(
    block: Extract<Docx2mdParsedBlock, { kind: "unsupported" }>,
    includeUnsupportedComments: boolean,
    options?: Docx2mdMarkdownRenderOptions
  ): string {
    const placeholder = renderImagePlaceholder(block.type, options);
    if (includeUnsupportedComments) {
      const comment = renderUnsupportedComment(block.type);
      return placeholder ? `${placeholder}\n${comment}` : comment;
    }
    return placeholder;
  }

  function renderMarkdownBlock(
    block: Docx2mdParsedBlock,
    includeUnsupportedComments: boolean,
    options?: Docx2mdMarkdownRenderOptions
  ): string {
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

  function renderMarkdown(
    parsedDocument: {
      blocks: Docx2mdParsedBlock[];
      comments?: Docx2mdParsedComment[];
    },
    options?: Docx2mdMarkdownRenderOptions
  ): string {
    const includeUnsupportedComments = !!options?.includeUnsupportedComments;
    const renderedBlocks = parsedDocument.blocks
      .map((block) => ({
        kind: block.kind,
        markdown: renderMarkdownBlock(block, includeUnsupportedComments, options)
      }))
      .filter((block) => block.markdown !== "");
    const bodyBlocks = renderedBlocks.map((block) => block.markdown);
    const commentFootnotes = renderCommentFootnotes(parsedDocument.comments);
    if (commentFootnotes) {
      bodyBlocks.push(commentFootnotes);
    }
    const body = bodyBlocks.reduce((markdown, blockMarkdown, index) => {
      if (index === 0) return blockMarkdown;
      const previousBlock = renderedBlocks[index - 1];
      const currentKind = renderedBlocks[index]?.kind;
      const separator = previousBlock?.kind === "listItem" && currentKind === "listItem" ? "\n" : "\n\n";
      return `${markdown}${separator}${blockMarkdown}`;
    }, "");
    return shouldIncludeFrontMatter(options) ? `${createFrontMatter(options)}\n\n${body}` : body;
  }

  moduleRegistry.registerModule("markdownRenderer", {
    renderMarkdown
  });
})();
