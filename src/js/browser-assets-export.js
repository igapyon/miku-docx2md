/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const docx2md = moduleRegistry.getModule("docx2md");
    const browserZip = moduleRegistry.getModule("browserZip");
    function requireDocx2md() {
        if (!docx2md) {
            throw new Error("docx2md core module is not loaded");
        }
        return docx2md;
    }
    function requireBrowserZip() {
        if (!browserZip) {
            throw new Error("browser ZIP module is not loaded");
        }
        return browserZip;
    }
    function createAssetsZipEntries(parsedDocument) {
        const manifestBytes = new TextEncoder().encode(requireDocx2md().createAssetsManifestText(parsedDocument));
        return [
            {
                name: "manifest.json",
                data: manifestBytes
            },
            ...parsedDocument.assets.map((asset) => ({
                name: asset.sourcePath,
                data: asset.bytes
            }))
        ];
    }
    function createAssetsZipBlob(parsedDocument) {
        if (!parsedDocument || parsedDocument.assets.length === 0) {
            return null;
        }
        const zipBytes = requireBrowserZip().createStoredZip(createAssetsZipEntries(parsedDocument));
        return new Blob([zipBytes], { type: "application/zip" });
    }
    moduleRegistry.registerModule("browserAssetsExport", {
        createAssetsZipBlob
    });
})();
