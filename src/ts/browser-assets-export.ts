/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const docx2md = moduleRegistry.getModule<{
    createAssetsManifestText: (parsedDocument: Docx2mdParsedAssetDocument) => string;
  }>("docx2md");
  const browserZip = moduleRegistry.getModule<{
    createStoredZip: (entries: Array<{ name: string; data: Uint8Array }>) => Uint8Array;
  }>("browserZip");
  const assetPath = moduleRegistry.getModule<{
    getSafeDocxAssetPath: (sourcePath: string) => string;
  }>("assetPath");

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

  function createAssetsZipEntries(parsedDocument: Docx2mdParsedDocx): Array<{ name: string; data: Uint8Array }> {
    const manifestBytes = new TextEncoder().encode(requireDocx2md().createAssetsManifestText(parsedDocument));
    return [
      {
        name: "manifest.json",
        data: manifestBytes
      },
      ...parsedDocument.assets
        .map((asset) => ({
          name: assetPath?.getSafeDocxAssetPath(asset.sourcePath) || "",
          data: asset.bytes
        }))
        .filter((entry) => entry.name)
    ];
  }

  function createAssetsZipBlob(parsedDocument: Docx2mdParsedDocx | null): Blob | null {
    if (!parsedDocument || parsedDocument.assets.length === 0) {
      return null;
    }
    const zipBytes = requireBrowserZip().createStoredZip(createAssetsZipEntries(parsedDocument));
    return new Blob([zipBytes as unknown as BlobPart], { type: "application/zip" });
  }

  moduleRegistry.registerModule("browserAssetsExport", {
    createAssetsZipBlob
  });
})();
