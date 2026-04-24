/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    function resolveZipPath(sourcePath, target) {
        if (!target)
            return target;
        if (target.startsWith("#"))
            return target;
        if (target.startsWith("/")) {
            return target.replace(/^\/+/, "");
        }
        const baseParts = sourcePath.split("/").slice(0, -1);
        for (const part of target.split("/")) {
            if (!part || part === ".")
                continue;
            if (part === "..") {
                baseParts.pop();
            }
            else {
                baseParts.push(part);
            }
        }
        return baseParts.join("/");
    }
    function parseRelationshipElement(element, sourcePath) {
        const id = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getAttributeValue(element, "Id")) || "";
        const rawTarget = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getAttributeValue(element, "Target")) || "";
        const type = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getAttributeValue(element, "Type")) || "";
        const mode = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getAttributeValue(element, "TargetMode")) || "";
        return {
            id,
            relationship: {
                target: mode === "External" ? rawTarget : resolveZipPath(sourcePath, rawTarget),
                type,
                mode
            }
        };
    }
    function parseRelationships(bytes, sourcePath) {
        const document = xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.parseXml(bytes);
        const relationshipElements = document ? (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(document, "Relationship")) || [] : [];
        const map = new Map();
        for (const element of relationshipElements) {
            const parsedRelationship = parseRelationshipElement(element, sourcePath);
            map.set(parsedRelationship.id, parsedRelationship.relationship);
        }
        return map;
    }
    moduleRegistry.registerModule("relsParser", {
        resolveZipPath,
        parseRelationships
    });
})();
