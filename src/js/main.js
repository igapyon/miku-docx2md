/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
window.addEventListener("DOMContentLoaded", () => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const docx2md = moduleRegistry.getModule("docx2md");
    if (!docx2md) {
        throw new Error("docx2md core module is not loaded");
    }
    const docx2mdApi = docx2md;
    const browserZip = moduleRegistry.getModule("browserZip");
    if (!browserZip) {
        throw new Error("browser ZIP module is not loaded");
    }
    const browserZipApi = browserZip;
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element not found: ${id}`);
        }
        return element;
    }
    function getInputElement(id) {
        return getElement(id);
    }
    function getPreview(id) {
        return getElement(id);
    }
    function setStatus(message) {
        getElement("statusText").textContent = message;
    }
    function setSummaryText(message) {
        getPreview("summaryPreview").setText(message);
    }
    function setMarkdownText(message) {
        getPreview("markdownPreview").setText(message);
    }
    function getDebugEnabled() {
        return getInputElement("debugComments").checked;
    }
    function getCurrentMarkdown() {
        if (!currentParsedDocument)
            return "";
        return docx2mdApi.renderMarkdown(currentParsedDocument, {
            includeUnsupportedComments: getDebugEnabled()
        });
    }
    function getOutputBaseName(fileName) {
        return fileName.replace(/\.docx$/i, "");
    }
    function getDownloadFileName(fileName) {
        return getOutputBaseName(fileName) + ".md";
    }
    function getSummaryDownloadFileName(fileName) {
        return getOutputBaseName(fileName) + ".summary.txt";
    }
    function getAssetsDownloadFileName(fileName) {
        return getOutputBaseName(fileName) + ".assets.zip";
    }
    function getSummaryText() {
        return getPreview("summaryPreview").getText();
    }
    function hasDownloadableAssets() {
        return !!currentParsedDocument && currentParsedDocument.assets.length > 0;
    }
    function showToast(message) {
        const toast = getElement("toast");
        if (typeof toast.show === "function") {
            toast.show(message);
            return;
        }
        setStatus(message);
    }
    function clearError() {
        const errorAlert = getElement("errorAlert");
        if (typeof errorAlert.clear === "function") {
            errorAlert.clear();
        }
    }
    function showError(message) {
        const errorAlert = getElement("errorAlert");
        if (typeof errorAlert.show === "function") {
            errorAlert.show(message);
        }
    }
    function setLoading(active) {
        const overlay = getElement("loadingOverlay");
        if (typeof overlay.setActive === "function") {
            overlay.setActive(active);
        }
    }
    function updateActionState() {
        const hasSelection = !!selectedFile;
        const hasRendered = !!currentParsedDocument;
        getElement("convertBtn").disabled = !hasSelection;
        getElement("downloadBtn").disabled = !hasRendered;
        getElement("downloadSummaryBtn").disabled = !hasRendered;
        getElement("downloadAssetsBtn").disabled = !hasDownloadableAssets();
    }
    function triggerDownload(fileName, content) {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        triggerBlobDownload(fileName, blob);
    }
    function triggerBlobDownload(fileName, blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
    function createAssetsZipEntries(parsedDocument) {
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
    function createAssetsZipBlob() {
        if (!currentParsedDocument || currentParsedDocument.assets.length === 0) {
            return null;
        }
        const zipBytes = browserZipApi.createStoredZip(createAssetsZipEntries(currentParsedDocument));
        return new Blob([zipBytes], { type: "application/zip" });
    }
    function canDownloadRenderedDocument() {
        return !!currentParsedDocument && !!currentFileName;
    }
    let currentParsedDocument = null;
    let currentFileName = "";
    let selectedFile = null;
    function clearPreviews() {
        getPreview("summaryPreview").clear();
        getPreview("markdownPreview").clear();
    }
    function resetRenderedState() {
        currentParsedDocument = null;
        clearPreviews();
        updateActionState();
    }
    function renderParsedDocument() {
        if (!currentParsedDocument) {
            resetRenderedState();
            return;
        }
        setSummaryText(docx2mdApi.createSummaryText(currentParsedDocument));
        setMarkdownText(getCurrentMarkdown());
        updateActionState();
    }
    async function handleFileSelect(file) {
        selectedFile = file;
        currentFileName = file.name;
        currentParsedDocument = null;
        clearError();
        clearPreviews();
        updateActionState();
        setStatus(`Selected ${file.name}. Ready to convert.`);
    }
    async function handleConvert() {
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
        }
        finally {
            setLoading(false);
        }
    }
    function downloadMarkdown() {
        if (!canDownloadRenderedDocument()) {
            return;
        }
        const fileName = getDownloadFileName(currentFileName);
        triggerDownload(fileName, getCurrentMarkdown());
        setStatus(`Downloaded ${fileName}`);
        showToast("Markdown saved");
    }
    function downloadSummary() {
        if (!canDownloadRenderedDocument()) {
            return;
        }
        const fileName = getSummaryDownloadFileName(currentFileName);
        triggerDownload(fileName, getSummaryText());
        setStatus(`Downloaded ${fileName}`);
        showToast("Summary saved");
    }
    function downloadAssets() {
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
    function bindEvents() {
        const fileInput = getInputElement("docxFileInput");
        getElement("docxFileSelect").addEventListener("lht-file-select:change", async (event) => {
            var _a, _b;
            const customEvent = event;
            const file = (_b = (_a = customEvent.detail) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b[0];
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
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                showError(message);
                setStatus(`Failed: ${message}`);
                resetRenderedState();
            }
        });
        getElement("downloadBtn").addEventListener("click", () => {
            downloadMarkdown();
        });
        getElement("downloadSummaryBtn").addEventListener("click", () => {
            downloadSummary();
        });
        getElement("downloadAssetsBtn").addEventListener("click", () => {
            downloadAssets();
        });
        getElement("clearBtn").addEventListener("click", () => {
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
