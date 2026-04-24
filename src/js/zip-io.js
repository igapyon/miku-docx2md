/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const textDecoder = new TextDecoder("utf-8");
    const nodeRequire = (() => {
        const candidate = globalThis.__docx2mdNodeRequire;
        return typeof candidate === "function" ? candidate : null;
    })();
    function readUint16LE(view, offset) {
        return view.getUint16(offset, true);
    }
    function readUint32LE(view, offset) {
        return view.getUint32(offset, true);
    }
    function decodeFileName(bytes) {
        return textDecoder.decode(bytes);
    }
    async function inflateRaw(data) {
        if (typeof DecompressionStream === "function") {
            try {
                const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
                const buffer = await new Response(stream).arrayBuffer();
                return new Uint8Array(buffer);
            }
            catch (_error) {
                // Fall through to node:zlib if available.
            }
        }
        if (nodeRequire) {
            const zlib = nodeRequire("node:zlib");
            return Uint8Array.from(zlib.inflateRawSync(data));
        }
        throw new Error("This environment does not support ZIP deflate decompression.");
    }
    async function unzipEntries(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        let eocdOffset = -1;
        for (let offset = view.byteLength - 22; offset >= Math.max(0, view.byteLength - 0x10000 - 22); offset -= 1) {
            if (readUint32LE(view, offset) === 0x06054b50) {
                eocdOffset = offset;
                break;
            }
        }
        if (eocdOffset < 0) {
            throw new Error("ZIP end-of-central-directory record was not found.");
        }
        const centralDirectorySize = readUint32LE(view, eocdOffset + 12);
        const centralDirectoryOffset = readUint32LE(view, eocdOffset + 16);
        const endOffset = centralDirectoryOffset + centralDirectorySize;
        const entries = [];
        let cursor = centralDirectoryOffset;
        while (cursor < endOffset) {
            if (readUint32LE(view, cursor) !== 0x02014b50) {
                throw new Error("ZIP central directory format is invalid.");
            }
            const compressionMethod = readUint16LE(view, cursor + 10);
            const compressedSize = readUint32LE(view, cursor + 20);
            const fileNameLength = readUint16LE(view, cursor + 28);
            const extraFieldLength = readUint16LE(view, cursor + 30);
            const fileCommentLength = readUint16LE(view, cursor + 32);
            const localHeaderOffset = readUint32LE(view, cursor + 42);
            const fileNameBytes = new Uint8Array(arrayBuffer, cursor + 46, fileNameLength);
            entries.push({
                name: decodeFileName(fileNameBytes),
                compressionMethod,
                compressedSize,
                localHeaderOffset
            });
            cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;
        }
        const files = new Map();
        for (const entry of entries) {
            const localOffset = entry.localHeaderOffset;
            if (readUint32LE(view, localOffset) !== 0x04034b50) {
                throw new Error(`ZIP local header is invalid: ${entry.name}`);
            }
            const fileNameLength = readUint16LE(view, localOffset + 26);
            const extraFieldLength = readUint16LE(view, localOffset + 28);
            const dataOffset = localOffset + 30 + fileNameLength + extraFieldLength;
            const compressedData = new Uint8Array(arrayBuffer, dataOffset, entry.compressedSize);
            let fileData;
            if (entry.compressionMethod === 0) {
                fileData = new Uint8Array(compressedData);
            }
            else if (entry.compressionMethod === 8) {
                fileData = await inflateRaw(compressedData);
            }
            else {
                throw new Error(`Unsupported compression method: ${entry.name} (method=${entry.compressionMethod})`);
            }
            files.set(entry.name, fileData);
        }
        return files;
    }
    moduleRegistry.registerModule("zipIo", {
        unzipEntries
    });
})();
