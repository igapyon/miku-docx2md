/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
  }>("xmlUtils");
  const documentAnchorParser = moduleRegistry.getModule<{
    extractParagraphAnchors: (paragraph: Element) => string[];
  }>("documentAnchorParser");

  function collectKnownAnchorIds(body: Element): Set<string> {
    const knownAnchorIds = new Set<string>();
    for (const paragraphElement of xmlUtils?.getChildrenByLocalName(body, "p") || []) {
      for (const anchorId of documentAnchorParser?.extractParagraphAnchors(paragraphElement) || []) {
        knownAnchorIds.add(anchorId);
      }
    }
    return knownAnchorIds;
  }

  function createParseContext(
    body: Element,
    summary: Docx2mdParsedSummary,
    comments: Docx2mdParsedComment[]
  ): Docx2mdParseContext {
    return {
      summary,
      knownAnchorIds: collectKnownAnchorIds(body),
      comments: new Map(comments.map((comment) => [comment.id, comment])),
      referencedCommentIds: new Set()
    };
  }

  function getReferencedComments(
    comments: Docx2mdParsedComment[],
    context: Docx2mdParseContext
  ): Docx2mdParsedComment[] {
    return comments.filter((comment) => context.referencedCommentIds.has(comment.id));
  }

  moduleRegistry.registerModule("documentParseContext", {
    createParseContext,
    getReferencedComments
  });
})();
