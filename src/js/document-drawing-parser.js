/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
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
            const relationshipId = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getNamespacedAttributeValue(blip, "r", "embed")) || "";
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
    function readTrimmedAttribute(element, name) {
        return ((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.getAttributeValue(element, name)) || "").trim();
    }
    function resolveImageAltTextFromUnsupportedElement(element) {
        const metadataElements = [
            ...((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(element, "docPr")) || []),
            ...((xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(element, "cNvPr")) || [])
        ];
        for (const metadataElement of metadataElements) {
            const description = readTrimmedAttribute(metadataElement, "descr");
            if (description)
                return description;
            const title = readTrimmedAttribute(metadataElement, "title");
            if (title)
                return title;
        }
        return "";
    }
    function resolveImageExtentFromUnsupportedElement(element) {
        const extentElements = (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(element, "extent")) || [];
        for (const extentElement of extentElements) {
            const cx = readTrimmedAttribute(extentElement, "cx");
            const cy = readTrimmedAttribute(extentElement, "cy");
            if (cx && cy) {
                return `${cx}x${cy}`;
            }
        }
        return "";
    }
    function formatDrawingImageTrace(imageTarget, imageAltText, imageExtent) {
        const parts = [`drawing:image(${imageTarget})`];
        if (imageAltText) {
            parts.push(`alt(${imageAltText})`);
        }
        if (imageExtent) {
            parts.push(`size-emu(${imageExtent})`);
        }
        return parts.join(":");
    }
    function describeUnsupportedElement(element, relationships) {
        const type = classifyUnsupportedType(element.localName || "unknown");
        if (type === "drawing") {
            const imageTarget = resolveImageTargetFromUnsupportedElement(element, relationships);
            const imageAltText = resolveImageAltTextFromUnsupportedElement(element);
            const imageExtent = resolveImageExtentFromUnsupportedElement(element);
            if (imageTarget) {
                return formatDrawingImageTrace(imageTarget, imageAltText, imageExtent);
            }
        }
        return type;
    }
    moduleRegistry.registerModule("documentDrawingParser", {
        describeUnsupportedElement
    });
})();
