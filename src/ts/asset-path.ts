/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();

  function getSafeDocxAssetPath(sourcePath: string): string {
    const normalized = String(sourcePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const parts = normalized.split("/");
    if (
      parts.length < 3
      || parts[0] !== "word"
      || parts[1] !== "media"
      || parts.some((part) => !part || part === "." || part === "..")
    ) {
      return "";
    }
    return parts.join("/");
  }

  moduleRegistry.registerModule("assetPath", {
    getSafeDocxAssetPath
  });
})();
