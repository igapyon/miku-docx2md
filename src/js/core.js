/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const docxPackageLoader = moduleRegistry.getModule("docxPackageLoader");
    const documentParser = moduleRegistry.getModule("documentParser");
    const docxAssets = moduleRegistry.getModule("docxAssets");
    const markdownRenderer = moduleRegistry.getModule("markdownRenderer");
    const docxSummary = moduleRegistry.getModule("docxSummary");
    const assetManifest = moduleRegistry.getModule("assetManifest");
    const documentSummary = moduleRegistry.getModule("documentSummary");
    function requireDocumentSummary() {
        if (!documentSummary) {
            throw new Error("DOCX document summary module is not loaded.");
        }
        return documentSummary;
    }
    async function parseDocx(arrayBuffer) {
        const loadedPackage = await (docxPackageLoader === null || docxPackageLoader === void 0 ? void 0 : docxPackageLoader.loadDocxPackage(arrayBuffer));
        if (!loadedPackage) {
            throw new Error("DOCX package loader module is not loaded.");
        }
        const parsedDocument = (documentParser === null || documentParser === void 0 ? void 0 : documentParser.parseDocumentXml(loadedPackage.documentXmlBytes, loadedPackage.relationshipsBytes, loadedPackage.stylesBytes, loadedPackage.numberingBytes))
            || requireDocumentSummary().createEmptyParsedDocument();
        const assets = (docxAssets === null || docxAssets === void 0 ? void 0 : docxAssets.collectImageAssets(parsedDocument.blocks, loadedPackage.files, loadedPackage.contentTypesBytes)) || [];
        return {
            ...parsedDocument,
            summary: {
                ...parsedDocument.summary,
                imageAssets: assets.length
            },
            assets
        };
    }
    moduleRegistry.registerModule("docx2md", {
        parseDocx,
        renderMarkdown: markdownRenderer === null || markdownRenderer === void 0 ? void 0 : markdownRenderer.renderMarkdown,
        createSummary: docxSummary === null || docxSummary === void 0 ? void 0 : docxSummary.createSummary,
        createSummaryText: docxSummary === null || docxSummary === void 0 ? void 0 : docxSummary.createSummaryText,
        createAssetsManifestText: assetManifest === null || assetManifest === void 0 ? void 0 : assetManifest.createAssetsManifestText
    });
})();
