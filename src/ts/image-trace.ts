/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const imageTracePrefix = "drawing:image(";

  function findSourcePathEnd(afterPrefix: string): number {
    const suffixMarkerIndexes = [
      afterPrefix.indexOf("):alt("),
      afterPrefix.indexOf("):size-emu(")
    ].filter((index) => index >= 0);
    return suffixMarkerIndexes.length > 0
      ? Math.min(...suffixMarkerIndexes)
      : (afterPrefix.endsWith(")") ? afterPrefix.length - 1 : -1);
  }

  function isSizeSuffix(suffix: string): boolean {
    return /^:size-emu\([^)]+\)$/.test(suffix);
  }

  function parseAltSuffix(suffix: string): string | null {
    const altAndRest = suffix.slice(":alt(".length);
    const sizeMarkerIndex = altAndRest.lastIndexOf("):size-emu(");
    const altEnd = sizeMarkerIndex >= 0
      ? sizeMarkerIndex
      : (altAndRest.endsWith(")") ? altAndRest.length - 1 : -1);
    if (altEnd < 0) return null;
    const rest = altAndRest.slice(altEnd + 1);
    if (rest && !isSizeSuffix(rest)) return null;
    return altAndRest.slice(0, altEnd);
  }

  function parseImageTraceSuffix(suffix: string): string | null {
    if (!suffix) return "";
    if (suffix.startsWith(":alt(")) {
      return parseAltSuffix(suffix);
    }
    return isSizeSuffix(suffix) ? "" : null;
  }

  function parseImageTrace(type: string): { sourcePath: string; altText: string } | null {
    if (!type.startsWith(imageTracePrefix)) return null;
    const afterPrefix = type.slice(imageTracePrefix.length);
    const sourcePathEnd = findSourcePathEnd(afterPrefix);
    if (sourcePathEnd < 0) return null;
    const sourcePath = afterPrefix.slice(0, sourcePathEnd);
    if (!sourcePath) return null;
    const altText = parseImageTraceSuffix(afterPrefix.slice(sourcePathEnd + 1));
    if (altText === null) {
      return null;
    }
    return {
      sourcePath,
      altText
    };
  }

  moduleRegistry.registerModule("imageTrace", {
    parseImageTrace
  });
})();
