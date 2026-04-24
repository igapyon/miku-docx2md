/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const utf8FileNameFlag = 0x0800;
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
    function createLocalFileHeader(entry) {
        const localHeader = new Uint8Array(30 + entry.nameBytes.length);
        const localView = new DataView(localHeader.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, utf8FileNameFlag, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, 0, true);
        localView.setUint16(12, 0, true);
        localView.setUint32(14, entry.crc32, true);
        localView.setUint32(18, entry.dataBytes.length, true);
        localView.setUint32(22, entry.dataBytes.length, true);
        localView.setUint16(26, entry.nameBytes.length, true);
        localView.setUint16(28, 0, true);
        localHeader.set(entry.nameBytes, 30);
        return localHeader;
    }
    function createCentralDirectoryHeader(entry) {
        const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
        const centralView = new DataView(centralHeader.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, utf8FileNameFlag, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, 0, true);
        centralView.setUint16(14, 0, true);
        centralView.setUint32(16, entry.crc32, true);
        centralView.setUint32(20, entry.dataBytes.length, true);
        centralView.setUint32(24, entry.dataBytes.length, true);
        centralView.setUint16(28, entry.nameBytes.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, entry.offset, true);
        centralHeader.set(entry.nameBytes, 46);
        return centralHeader;
    }
    function createEndOfCentralDirectory(entryCount, centralDirectorySize, centralDirectoryOffset) {
        const eocd = new Uint8Array(22);
        const eocdView = new DataView(eocd.buffer);
        eocdView.setUint32(0, 0x06054b50, true);
        eocdView.setUint16(4, 0, true);
        eocdView.setUint16(6, 0, true);
        eocdView.setUint16(8, entryCount, true);
        eocdView.setUint16(10, entryCount, true);
        eocdView.setUint32(12, centralDirectorySize, true);
        eocdView.setUint32(16, centralDirectoryOffset, true);
        eocdView.setUint16(20, 0, true);
        return eocd;
    }
    function copyChunks(chunks) {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const out = new Uint8Array(totalLength);
        let cursor = 0;
        for (const chunk of chunks) {
            out.set(chunk, cursor);
            cursor += chunk.length;
        }
        return out;
    }
    function createStoredZip(entries) {
        const encoder = new TextEncoder();
        const localChunks = [];
        const centralChunks = [];
        let offset = 0;
        for (const entry of entries) {
            const preparedEntry = {
                nameBytes: encoder.encode(entry.name),
                dataBytes: entry.data,
                crc32: calculateCrc32(entry.data),
                offset
            };
            const localHeader = createLocalFileHeader(preparedEntry);
            localChunks.push(localHeader, preparedEntry.dataBytes);
            centralChunks.push(createCentralDirectoryHeader(preparedEntry));
            offset += localHeader.length + preparedEntry.dataBytes.length;
        }
        const centralDirectoryOffset = offset;
        const centralDirectorySize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const eocd = createEndOfCentralDirectory(entries.length, centralDirectorySize, centralDirectoryOffset);
        return copyChunks([...localChunks, ...centralChunks, eocd]);
    }
    moduleRegistry.registerModule("browserZip", {
        createStoredZip
    });
})();
