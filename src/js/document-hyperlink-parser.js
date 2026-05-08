/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const documentAnchorParser = moduleRegistry.getModule("documentAnchorParser");
    function normalizeAnchorName(name) {
        return (documentAnchorParser === null || documentAnchorParser === void 0 ? void 0 : documentAnchorParser.normalizeAnchorName(name)) || "";
    }
    function normalizeRelationshipAnchorTarget(target) {
        return (documentAnchorParser === null || documentAnchorParser === void 0 ? void 0 : documentAnchorParser.normalizeRelationshipAnchorTarget(target)) || "";
    }
    function renderHyperlink(hyperlinkElement, linkText, relationships, context) {
        const relationshipId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getNamespacedAttributeValue(hyperlinkElement, "r", "id")) || "";
        const anchor = normalizeAnchorName((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(hyperlinkElement, "anchor")) || "");
        const relationship = relationshipId ? relationships.get(relationshipId) || null : null;
        const relationshipAnchor = relationship ? normalizeRelationshipAnchorTarget(relationship.target) : "";
        if ((relationship === null || relationship === void 0 ? void 0 : relationship.mode) === "External") {
            context.summary.links += 1;
            context.summary.externalLinks += 1;
            return `[${linkText}](${relationship.target})`;
        }
        if (relationshipAnchor && context.knownAnchorIds.has(relationshipAnchor)) {
            context.summary.links += 1;
            context.summary.internalLinks += 1;
            return `[${linkText}](#${relationshipAnchor})`;
        }
        if (anchor && context.knownAnchorIds.has(anchor)) {
            context.summary.links += 1;
            context.summary.internalLinks += 1;
            return `[${linkText}](#${anchor})`;
        }
        return linkText;
    }
    moduleRegistry.registerModule("documentHyperlinkParser", {
        renderHyperlink
    });
})();
