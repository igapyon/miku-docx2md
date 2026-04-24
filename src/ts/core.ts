/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const docxPackageLoader = moduleRegistry.getModule<{
    loadDocxPackage: (arrayBuffer: ArrayBuffer) => Promise<Docx2mdLoadedPackage>;
  }>("docxPackageLoader");
  const documentParser = moduleRegistry.getModule<{
    parseDocumentXml: (
      documentXmlBytes: Uint8Array,
      relationshipsBytes?: Uint8Array,
      stylesBytes?: Uint8Array,
      numberingBytes?: Uint8Array
    ) => Docx2mdParsedDocument;
  }>("documentParser");
  const docxAssets = moduleRegistry.getModule<{
    collectImageAssets: (blocks: Docx2mdParsedDocument["blocks"], files: Map<string, Uint8Array>, contentTypesBytes?: Uint8Array) => Docx2mdParsedImageAsset[];
  }>("docxAssets");
  const markdownRenderer = moduleRegistry.getModule<{
    renderMarkdown: (
      parsedDocument: { blocks: Docx2mdParsedDocument["blocks"] },
      options?: Docx2mdMarkdownRenderOptions
    ) => string;
  }>("markdownRenderer");
  const docxSummary = moduleRegistry.getModule<{
    createSummary: (parsedDocument: { summary: Docx2mdParsedSummary }) => Docx2mdParsedSummary;
    createSummaryText: (parsedDocument: { summary: Docx2mdParsedSummary; blocks: Array<unknown> }) => string;
  }>("docxSummary");
  const assetManifest = moduleRegistry.getModule<{
    createAssetsManifestText: (parsedDocument: Docx2mdParsedAssetDocument) => string;
  }>("assetManifest");
  const documentSummary = moduleRegistry.getModule<{
    createEmptyParsedDocument: () => Docx2mdParsedDocument;
  }>("documentSummary");

  function requireDocumentSummary() {
    if (!documentSummary) {
      throw new Error("DOCX document summary module is not loaded.");
    }
    return documentSummary;
  }

  async function parseDocx(arrayBuffer: ArrayBuffer): Promise<Docx2mdParsedDocx> {
    const loadedPackage = await docxPackageLoader?.loadDocxPackage(arrayBuffer);
    if (!loadedPackage) {
      throw new Error("DOCX package loader module is not loaded.");
    }
    const parsedDocument = documentParser?.parseDocumentXml(
      loadedPackage.documentXmlBytes,
      loadedPackage.relationshipsBytes,
      loadedPackage.stylesBytes,
      loadedPackage.numberingBytes
    )
      || requireDocumentSummary().createEmptyParsedDocument();
    const assets = docxAssets?.collectImageAssets(
      parsedDocument.blocks,
      loadedPackage.files,
      loadedPackage.contentTypesBytes
    ) || [];
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
    renderMarkdown: markdownRenderer?.renderMarkdown,
    createSummary: docxSummary?.createSummary,
    createSummaryText: docxSummary?.createSummaryText,
    createAssetsManifestText: assetManifest?.createAssetsManifestText
  });
})();
