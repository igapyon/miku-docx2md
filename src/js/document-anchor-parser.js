/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
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
            const rawName = ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getWordAttributeValue(bookmark, "name")) || "").trim();
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
    moduleRegistry.registerModule("documentAnchorParser", {
        normalizeAnchorName,
        extractParagraphAnchors,
        normalizeRelationshipAnchorTarget,
        claimUniqueAnchorIds
    });
})();
