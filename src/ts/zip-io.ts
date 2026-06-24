/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const msOfficeCore = moduleRegistry.getModule<{
    readZipPackageAsync: (
      data: Uint8Array,
      options?: {
        inflateRaw?: (data: Uint8Array, expectedSize: number, path: string) => Promise<Uint8Array> | Uint8Array;
      }
    ) => Promise<{
      diagnostics: { severity: string; message: string; path?: string }[];
      entries: { path: string; data: Uint8Array }[];
    }>;
  }>("msOfficeCore");
  const nodeRequire = (() => {
    const candidate = (globalThis as typeof globalThis & {
      __docx2mdNodeRequire?: ((id: string) => unknown) | undefined;
    }).__docx2mdNodeRequire;
    return typeof candidate === "function" ? candidate : null;
  })();

  async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
    if (typeof DecompressionStream === "function") {
      try {
        const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        const buffer = await new Response(stream).arrayBuffer();
        return new Uint8Array(buffer);
      } catch (_error) {
        // Fall through to node:zlib if available.
      }
    }
    if (nodeRequire) {
      const zlib = nodeRequire("node:zlib") as { inflateRawSync: (input: Uint8Array) => Uint8Array };
      return Uint8Array.from(zlib.inflateRawSync(data));
    }
    throw new Error("This environment does not support ZIP deflate decompression.");
  }

  async function unzipEntries(arrayBuffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
    if (!msOfficeCore) {
      throw new Error("miku-ms-office-core module is not loaded.");
    }
    const result = await msOfficeCore.readZipPackageAsync(new Uint8Array(arrayBuffer), {
      inflateRaw
    });
    const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    if (errors.length > 0) {
      throw new Error(errors.map((diagnostic) => diagnostic.path ? `${diagnostic.path}: ${diagnostic.message}` : diagnostic.message).join("\n"));
    }

    const files = new Map<string, Uint8Array>();
    for (const entry of result.entries) {
      files.set(entry.path, entry.data);
    }
    return files;
  }

  moduleRegistry.registerModule("zipIo", {
    unzipEntries
  });
})();
