/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const imageTrace = moduleRegistry.getModule<{
    parseImageTrace: (type: string) => { sourcePath: string; altText: string } | null;
  }>("imageTrace");
  const xmlUtils = moduleRegistry.getModule<{
    getAttributeValue: (element: Element | null | undefined, name: string, fallback?: string) => string;
  }>("xmlUtils");
  const textDecoder = new TextDecoder("utf-8");

  type ContentTypeMaps = {
    defaults: Map<string, string>;
    overrides: Map<string, string>;
  };

  function inferImageMediaType(sourcePath: string): string {
    const normalized = sourcePath.toLowerCase();
    if (normalized.endsWith(".png")) return "image/png";
    if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
    if (normalized.endsWith(".gif")) return "image/gif";
    if (normalized.endsWith(".bmp")) return "image/bmp";
    if (normalized.endsWith(".webp")) return "image/webp";
    if (normalized.endsWith(".svg")) return "image/svg+xml";
    if (normalized.endsWith(".tif") || normalized.endsWith(".tiff")) return "image/tiff";
    return "application/octet-stream";
  }

  function normalizePackagePath(filePath: string): string {
    return String(filePath || "").replace(/^\/+/, "");
  }

  function getPathExtension(filePath: string): string {
    const normalized = normalizePackagePath(filePath);
    const lastSegment = normalized.split("/").pop() || "";
    const extensionIndex = lastSegment.lastIndexOf(".");
    if (extensionIndex < 0) return "";
    return lastSegment.slice(extensionIndex + 1).toLowerCase();
  }

  function addContentTypeDefault(parsed: ContentTypeMaps, element: Element): void {
    const extension = (xmlUtils?.getAttributeValue(element, "Extension") || "").trim().toLowerCase();
    const contentType = (xmlUtils?.getAttributeValue(element, "ContentType") || "").trim();
    if (!extension || !contentType) return;
    parsed.defaults.set(extension, contentType);
  }

  function addContentTypeOverride(parsed: ContentTypeMaps, element: Element): void {
    const partName = normalizePackagePath((xmlUtils?.getAttributeValue(element, "PartName") || "").trim());
    const contentType = (xmlUtils?.getAttributeValue(element, "ContentType") || "").trim();
    if (!partName || !contentType) return;
    parsed.overrides.set(partName, contentType);
  }

  function parseContentTypes(contentTypesBytes?: Uint8Array): ContentTypeMaps {
    const parsed = {
      defaults: new Map<string, string>(),
      overrides: new Map<string, string>()
    };
    if (!contentTypesBytes || typeof DOMParser !== "function") {
      return parsed;
    }
    const xml = textDecoder.decode(contentTypesBytes);
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const defaultElements = Array.from(document.getElementsByTagName("Default"));
    const overrideElements = Array.from(document.getElementsByTagName("Override"));
    for (const element of defaultElements) {
      addContentTypeDefault(parsed, element);
    }
    for (const element of overrideElements) {
      addContentTypeOverride(parsed, element);
    }
    return parsed;
  }

  function resolveImageMediaType(
    sourcePath: string,
    contentTypes: ContentTypeMaps
  ): string {
    const normalizedSourcePath = normalizePackagePath(sourcePath);
    const overrideType = contentTypes.overrides.get(normalizedSourcePath);
    if (overrideType) return overrideType;
    const extensionType = contentTypes.defaults.get(getPathExtension(normalizedSourcePath));
    if (extensionType) return extensionType;
    return inferImageMediaType(normalizedSourcePath);
  }

  function getBlockTraceTypes(block: Docx2mdParsedBlock): string[] {
    return block.kind === "unsupported"
      ? [block.type]
      : (block.unsupportedTypes || []);
  }

  function createImageAsset(
    parsedTrace: { sourcePath: string; altText: string },
    traceType: string,
    block: Docx2mdParsedBlock,
    blockIndex: number,
    traceIndex: number,
    bytes: Uint8Array,
    contentTypes: ContentTypeMaps
  ): Docx2mdParsedImageAsset {
    return {
      kind: "image",
      sourcePath: parsedTrace.sourcePath,
      mediaType: resolveImageMediaType(parsedTrace.sourcePath, contentTypes),
      altText: parsedTrace.altText,
      sourceTrace: traceType,
      blockIndex,
      documentPosition: {
        blockIndex,
        blockKind: block.kind,
        traceIndex
      },
      bytes
    };
  }

  function collectImageAssets(
    blocks: Docx2mdParsedBlock[],
    files: Map<string, Uint8Array>,
    contentTypesBytes?: Uint8Array
  ): Docx2mdParsedImageAsset[] {
    const contentTypes = parseContentTypes(contentTypesBytes);
    const assets: Docx2mdParsedImageAsset[] = [];
    const seen = new Set<string>();
    for (const [blockIndex, block] of blocks.entries()) {
      for (const [traceIndex, traceType] of getBlockTraceTypes(block).entries()) {
        const parsedTrace = imageTrace?.parseImageTrace(traceType);
        if (!parsedTrace) continue;
        if (seen.has(parsedTrace.sourcePath)) continue;
        const bytes = files.get(parsedTrace.sourcePath);
        if (!bytes) continue;
        seen.add(parsedTrace.sourcePath);
        assets.push(createImageAsset(parsedTrace, traceType, block, blockIndex, traceIndex, bytes, contentTypes));
      }
    }
    return assets;
  }

  moduleRegistry.registerModule("docxAssets", {
    collectImageAssets
  });
})();
