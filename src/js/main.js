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
        return docx2md.renderMarkdown(currentParsedDocument, {
            includeUnsupportedComments: getDebugEnabled()
        });
    }
    function getDownloadFileName(fileName) {
        return fileName.replace(/\.docx$/i, "") + ".md";
    }
    function getSummaryDownloadFileName(fileName) {
        return fileName.replace(/\.docx$/i, "") + ".summary.txt";
    }
    function getSummaryText() {
        return getPreview("summaryPreview").getText();
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
    }
    function triggerDownload(fileName, content) {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
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
        setSummaryText(docx2md.createSummaryText(currentParsedDocument));
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
            currentParsedDocument = await docx2md.parseDocx(arrayBuffer);
            renderParsedDocument();
            setStatus(`Converted ${selectedFile.name}`);
            showToast("Converted to Markdown");
        }
        finally {
            setLoading(false);
        }
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
            if (!currentParsedDocument || !currentFileName) {
                return;
            }
            triggerDownload(getDownloadFileName(currentFileName), getCurrentMarkdown());
            setStatus(`Downloaded ${getDownloadFileName(currentFileName)}`);
            showToast("Markdown saved");
        });
        getElement("downloadSummaryBtn").addEventListener("click", () => {
            if (!currentParsedDocument || !currentFileName) {
                return;
            }
            triggerDownload(getSummaryDownloadFileName(currentFileName), getSummaryText());
            setStatus(`Downloaded ${getSummaryDownloadFileName(currentFileName)}`);
            showToast("Summary saved");
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
