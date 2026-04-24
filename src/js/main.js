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
    function getAssetsDownloadFileName(fileName) {
        return fileName.replace(/\.docx$/i, "") + ".assets.zip";
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
    function createCrc32Table() {
        const table = new Uint32Array(256);
        for (let index = 0; index < table.length; index += 1) {
            let value = index;
            for (let bit = 0; bit < 8; bit += 1) {
                value = (value & 1) ? ((value >>> 1) ^ 0xedb88320) : (value >>> 1);
            }
            table[index] = value >>> 0;
        }
        return table;
    }
    const crc32Table = createCrc32Table();
    function calculateCrc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) {
            crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
        }
        return (crc ^ 0xffffffff) >>> 0;
    }
    function createStoredZip(entries) {
        const encoder = new TextEncoder();
        const localChunks = [];
        const centralChunks = [];
        const utf8FileNameFlag = 0x0800;
        let offset = 0;
        for (const entry of entries) {
            const nameBytes = encoder.encode(entry.name);
            const dataBytes = entry.data;
            const crc32 = calculateCrc32(dataBytes);
            const localHeader = new Uint8Array(30 + nameBytes.length);
            const localView = new DataView(localHeader.buffer);
            localView.setUint32(0, 0x04034b50, true);
            localView.setUint16(4, 20, true);
            localView.setUint16(6, utf8FileNameFlag, true);
            localView.setUint16(8, 0, true);
            localView.setUint16(10, 0, true);
            localView.setUint16(12, 0, true);
            localView.setUint32(14, crc32, true);
            localView.setUint32(18, dataBytes.length, true);
            localView.setUint32(22, dataBytes.length, true);
            localView.setUint16(26, nameBytes.length, true);
            localView.setUint16(28, 0, true);
            localHeader.set(nameBytes, 30);
            localChunks.push(localHeader, dataBytes);
            const centralHeader = new Uint8Array(46 + nameBytes.length);
            const centralView = new DataView(centralHeader.buffer);
            centralView.setUint32(0, 0x02014b50, true);
            centralView.setUint16(4, 20, true);
            centralView.setUint16(6, 20, true);
            centralView.setUint16(8, utf8FileNameFlag, true);
            centralView.setUint16(10, 0, true);
            centralView.setUint16(12, 0, true);
            centralView.setUint16(14, 0, true);
            centralView.setUint32(16, crc32, true);
            centralView.setUint32(20, dataBytes.length, true);
            centralView.setUint32(24, dataBytes.length, true);
            centralView.setUint16(28, nameBytes.length, true);
            centralView.setUint16(30, 0, true);
            centralView.setUint16(32, 0, true);
            centralView.setUint16(34, 0, true);
            centralView.setUint16(36, 0, true);
            centralView.setUint32(38, 0, true);
            centralView.setUint32(42, offset, true);
            centralHeader.set(nameBytes, 46);
            centralChunks.push(centralHeader);
            offset += localHeader.length + dataBytes.length;
        }
        const centralDirectoryOffset = offset;
        const centralDirectorySize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const eocd = new Uint8Array(22);
        const eocdView = new DataView(eocd.buffer);
        eocdView.setUint32(0, 0x06054b50, true);
        eocdView.setUint16(4, 0, true);
        eocdView.setUint16(6, 0, true);
        eocdView.setUint16(8, entries.length, true);
        eocdView.setUint16(10, entries.length, true);
        eocdView.setUint32(12, centralDirectorySize, true);
        eocdView.setUint32(16, centralDirectoryOffset, true);
        eocdView.setUint16(20, 0, true);
        const totalLength = localChunks.reduce((sum, chunk) => sum + chunk.length, 0)
            + centralDirectorySize
            + eocd.length;
        const out = new Uint8Array(totalLength);
        let cursor = 0;
        for (const chunk of localChunks) {
            out.set(chunk, cursor);
            cursor += chunk.length;
        }
        for (const chunk of centralChunks) {
            out.set(chunk, cursor);
            cursor += chunk.length;
        }
        out.set(eocd, cursor);
        return out;
    }
    function createAssetsZipBlob() {
        if (!currentParsedDocument || currentParsedDocument.assets.length === 0) {
            return null;
        }
        const manifestBytes = new TextEncoder().encode(docx2md.createAssetsManifestText(currentParsedDocument));
        const zipBytes = createStoredZip([
            {
                name: "manifest.json",
                data: manifestBytes
            },
            ...currentParsedDocument.assets.map((asset) => ({
                name: asset.sourcePath,
                data: asset.bytes
            }))
        ]);
        return new Blob([zipBytes], { type: "application/zip" });
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
        getElement("downloadAssetsBtn").addEventListener("click", () => {
            if (!currentParsedDocument || !currentFileName) {
                return;
            }
            const assetsZip = createAssetsZipBlob();
            if (!assetsZip) {
                setStatus("No image assets available.");
                return;
            }
            triggerBlobDownload(getAssetsDownloadFileName(currentFileName), assetsZip);
            setStatus(`Downloaded ${getAssetsDownloadFileName(currentFileName)}`);
            showToast("Assets ZIP saved");
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
