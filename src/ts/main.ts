/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

window.addEventListener("DOMContentLoaded", () => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const docx2md = moduleRegistry.getModule<{
    parseDocx: (arrayBuffer: ArrayBuffer) => Promise<Docx2mdParsedDocx>;
    renderMarkdown: (
      parsedDocument: Pick<Docx2mdParsedDocument, "blocks">,
      options?: Docx2mdMarkdownRenderOptions
    ) => string;
    createSummaryText: (parsedDocument: Pick<Docx2mdParsedDocument, "summary">) => string;
    createAssetsManifestText: (parsedDocument: Docx2mdParsedAssetDocument) => string;
  }>("docx2md");

  if (!docx2md) {
    throw new Error("docx2md core module is not loaded");
  }
  const docx2mdApi = docx2md;
  const browserZip = moduleRegistry.getModule<{
    createStoredZip: (entries: Array<{ name: string; data: Uint8Array }>) => Uint8Array;
  }>("browserZip");

  if (!browserZip) {
    throw new Error("browser ZIP module is not loaded");
  }
  const browserZipApi = browserZip;

  function getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element not found: ${id}`);
    }
    return element;
  }

  function getInputElement(id: string): HTMLInputElement {
    return getElement(id) as HTMLInputElement;
  }

  function getPreview(id: string): {
    setText: (text: string) => void;
    clear: () => void;
    getText: () => string;
  } {
    return getElement(id) as unknown as {
      setText: (text: string) => void;
      clear: () => void;
      getText: () => string;
    };
  }

  function setStatus(message: string): void {
    getElement("statusText").textContent = message;
  }

  function setSummaryText(message: string): void {
    getPreview("summaryPreview").setText(message);
  }

  function setMarkdownText(message: string): void {
    getPreview("markdownPreview").setText(message);
  }

  function getDebugEnabled(): boolean {
    return getInputElement("debugComments").checked;
  }

  function getCurrentMarkdown(): string {
    if (!currentParsedDocument) return "";
    return docx2mdApi.renderMarkdown(currentParsedDocument, {
      includeUnsupportedComments: getDebugEnabled()
    });
  }

  function getOutputBaseName(fileName: string): string {
    return fileName.replace(/\.docx$/i, "");
  }

  function getDownloadFileName(fileName: string): string {
    return getOutputBaseName(fileName) + ".md";
  }

  function getSummaryDownloadFileName(fileName: string): string {
    return getOutputBaseName(fileName) + ".summary.txt";
  }

  function getAssetsDownloadFileName(fileName: string): string {
    return getOutputBaseName(fileName) + ".assets.zip";
  }

  function getSummaryText(): string {
    return getPreview("summaryPreview").getText();
  }

  function hasDownloadableAssets(): boolean {
    return !!currentParsedDocument && currentParsedDocument.assets.length > 0;
  }

  function showToast(message: string): void {
    const toast = getElement("toast") as HTMLElement & { show?: (message: string) => void };
    if (typeof toast.show === "function") {
      toast.show(message);
      return;
    }
    setStatus(message);
  }

  function clearError(): void {
    const errorAlert = getElement("errorAlert") as HTMLElement & { clear?: () => void };
    if (typeof errorAlert.clear === "function") {
      errorAlert.clear();
    }
  }

  function showError(message: string): void {
    const errorAlert = getElement("errorAlert") as HTMLElement & { show?: (message: string) => void };
    if (typeof errorAlert.show === "function") {
      errorAlert.show(message);
    }
  }

  function setLoading(active: boolean): void {
    const overlay = getElement("loadingOverlay") as HTMLElement & { setActive?: (active: boolean) => void };
    if (typeof overlay.setActive === "function") {
      overlay.setActive(active);
    }
  }

  function updateActionState(): void {
    const hasSelection = !!selectedFile;
    const hasRendered = !!currentParsedDocument;
    (getElement("convertBtn") as HTMLButtonElement).disabled = !hasSelection;
    (getElement("downloadBtn") as HTMLButtonElement).disabled = !hasRendered;
    (getElement("downloadSummaryBtn") as HTMLButtonElement).disabled = !hasRendered;
    (getElement("downloadAssetsBtn") as HTMLButtonElement).disabled = !hasDownloadableAssets();
  }

  function triggerDownload(fileName: string, content: string): void {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    triggerBlobDownload(fileName, blob);
  }

  function triggerBlobDownload(fileName: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function createAssetsZipEntries(parsedDocument: Docx2mdParsedDocx): Array<{ name: string; data: Uint8Array }> {
    const manifestBytes = new TextEncoder().encode(docx2mdApi.createAssetsManifestText(parsedDocument));
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

  function createAssetsZipBlob(): Blob | null {
    if (!currentParsedDocument || currentParsedDocument.assets.length === 0) {
      return null;
    }
    const zipBytes = browserZipApi.createStoredZip(createAssetsZipEntries(currentParsedDocument));
    return new Blob([zipBytes as unknown as BlobPart], { type: "application/zip" });
  }

  function canDownloadRenderedDocument(): boolean {
    return !!currentParsedDocument && !!currentFileName;
  }

  let currentParsedDocument: Awaited<ReturnType<typeof docx2mdApi.parseDocx>> | null = null;
  let currentFileName = "";
  let selectedFile: File | null = null;

  function clearPreviews(): void {
    getPreview("summaryPreview").clear();
    getPreview("markdownPreview").clear();
  }

  function resetRenderedState(): void {
    currentParsedDocument = null;
    clearPreviews();
    updateActionState();
  }

  function renderParsedDocument(): void {
    if (!currentParsedDocument) {
      resetRenderedState();
      return;
    }
    setSummaryText(docx2mdApi.createSummaryText(currentParsedDocument));
    setMarkdownText(getCurrentMarkdown());
    updateActionState();
  }

  async function handleFileSelect(file: File): Promise<void> {
    selectedFile = file;
    currentFileName = file.name;
    currentParsedDocument = null;
    clearError();
    clearPreviews();
    updateActionState();
    setStatus(`Selected ${file.name}. Ready to convert.`);
  }

  async function handleConvert(): Promise<void> {
    if (!selectedFile) {
      setStatus("Select a .docx file first.");
      return;
    }
    clearError();
    setLoading(true);
    setStatus(`Loading ${selectedFile.name} ...`);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      currentParsedDocument = await docx2mdApi.parseDocx(arrayBuffer);
      renderParsedDocument();
      setStatus(`Converted ${selectedFile.name}`);
      showToast("Converted to Markdown");
    } finally {
      setLoading(false);
    }
  }

  function downloadMarkdown(): void {
    if (!canDownloadRenderedDocument()) {
      return;
    }
    const fileName = getDownloadFileName(currentFileName);
    triggerDownload(fileName, getCurrentMarkdown());
    setStatus(`Downloaded ${fileName}`);
    showToast("Markdown saved");
  }

  function downloadSummary(): void {
    if (!canDownloadRenderedDocument()) {
      return;
    }
    const fileName = getSummaryDownloadFileName(currentFileName);
    triggerDownload(fileName, getSummaryText());
    setStatus(`Downloaded ${fileName}`);
    showToast("Summary saved");
  }

  function downloadAssets(): void {
    if (!canDownloadRenderedDocument()) {
      return;
    }
    const assetsZip = createAssetsZipBlob();
    if (!assetsZip) {
      setStatus("No image assets available.");
      return;
    }
    const fileName = getAssetsDownloadFileName(currentFileName);
    triggerBlobDownload(fileName, assetsZip);
    setStatus(`Downloaded ${fileName}`);
    showToast("Assets ZIP saved");
  }

  function bindEvents(): void {
    const fileInput = getInputElement("docxFileInput");
    getElement("docxFileSelect").addEventListener("lht-file-select:change", async (event: Event) => {
      const customEvent = event as CustomEvent<{ files?: File[] }>;
      const file = customEvent.detail?.files?.[0];
      if (!file) {
        selectedFile = null;
        currentFileName = "";
        resetRenderedState();
        setStatus("No file selected.");
        return;
      }
      await handleFileSelect(file);
    });

    getInputElement("debugComments").addEventListener("change", () => {
      if (currentParsedDocument) {
        renderParsedDocument();
      }
    });

    getElement("convertBtn").addEventListener("click", async () => {
      try {
        await handleConvert();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(message);
        setStatus(`Failed: ${message}`);
        resetRenderedState();
      }
    });

    (getElement("downloadBtn") as HTMLButtonElement).addEventListener("click", () => {
      downloadMarkdown();
    });

    (getElement("downloadSummaryBtn") as HTMLButtonElement).addEventListener("click", () => {
      downloadSummary();
    });

    (getElement("downloadAssetsBtn") as HTMLButtonElement).addEventListener("click", () => {
      downloadAssets();
    });

    (getElement("clearBtn") as HTMLButtonElement).addEventListener("click", () => {
      fileInput.value = "";
      getElement("docxFileName").textContent = "No file selected";
      selectedFile = null;
      currentFileName = "";
      clearError();
      resetRenderedState();
      setStatus("Cleared current document");
    });
  }

  bindEvents();
  setStatus("Select a .docx file to convert.");
  clearError();
  resetRenderedState();
});
