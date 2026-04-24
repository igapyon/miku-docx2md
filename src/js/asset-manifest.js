/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    function createAssetManifestEntry(asset) {
        return {
            kind: asset.kind,
            sourcePath: asset.sourcePath,
            mediaType: asset.mediaType,
            altText: asset.altText,
            sourceTrace: asset.sourceTrace,
            blockIndex: asset.blockIndex,
            documentPosition: asset.documentPosition,
            size: asset.bytes.length
        };
    }
    function createAssetsManifestText(parsedDocument) {
        return JSON.stringify({
            version: 1,
            assets: (parsedDocument.assets || []).map((asset) => createAssetManifestEntry(asset))
        }, null, 2);
    }
    moduleRegistry.registerModule("assetManifest", {
        createAssetsManifestText
    });
})();
