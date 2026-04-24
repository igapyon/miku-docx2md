/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
    getWordAttributeValue: (element: Element | null | undefined, localName: string, fallback?: string) => string;
  }>("xmlUtils");

  type ParsedTable = Extract<Docx2mdParsedBlock, { kind: "table" }>;

  function getGridSpan(cell: Element): number {
    const cellProperties = xmlUtils?.getChildrenByLocalName(cell, "tcPr")[0] || null;
    const gridSpan = cellProperties ? (xmlUtils?.getChildrenByLocalName(cellProperties, "gridSpan")[0] || null) : null;
    const value = xmlUtils?.getWordAttributeValue(gridSpan, "val", "1") || "1";
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  function getVerticalMergeState(cell: Element): "restart" | "continue" | null {
    const cellProperties = xmlUtils?.getChildrenByLocalName(cell, "tcPr")[0] || null;
    const verticalMerge = cellProperties ? (xmlUtils?.getChildrenByLocalName(cellProperties, "vMerge")[0] || null) : null;
    if (!verticalMerge) return null;
    const value = xmlUtils?.getWordAttributeValue(verticalMerge, "val") || "";
    if (!value || value === "continue") return "continue";
    if (value === "restart") return "restart";
    return null;
  }

  function normalizeRows(rows: string[][]): void {
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    for (const row of rows) {
      while (row.length < columnCount) {
        row.push("");
      }
    }
  }

  function appendMergedCellPlaceholders(row: string[], span: number): void {
    for (let index = 0; index < span; index += 1) {
      row.push(index === 0 ? "↑M↑" : "←M←");
    }
  }

  function appendHorizontalSpanPlaceholders(row: string[], span: number): void {
    for (let index = 1; index < span; index += 1) {
      row.push("←M←");
    }
  }

  function parseTableRow(
    rowElement: Element,
    unsupportedTypes: string[],
    extractCellText: (cell: Element, tableUnsupportedTypes: string[]) => string
  ): string[] {
    const row: string[] = [];
    for (const cellElement of xmlUtils?.getChildrenByLocalName(rowElement, "tc") || []) {
      const span = getGridSpan(cellElement);
      const verticalMergeState = getVerticalMergeState(cellElement);
      const text = extractCellText(cellElement, unsupportedTypes);
      if (verticalMergeState === "continue") {
        appendMergedCellPlaceholders(row, span);
        continue;
      }
      row.push(text);
      appendHorizontalSpanPlaceholders(row, span);
    }
    return row;
  }

  function parseTableElement(
    table: Element,
    extractCellText: (cell: Element, tableUnsupportedTypes: string[]) => string
  ): ParsedTable {
    const rows: string[][] = [];
    const unsupportedTypes: string[] = [];
    for (const rowElement of xmlUtils?.getChildrenByLocalName(table, "tr") || []) {
      rows.push(parseTableRow(rowElement, unsupportedTypes, extractCellText));
    }

    normalizeRows(rows);

    return {
      kind: "table",
      rows,
      unsupportedTypes: unsupportedTypes.length ? unsupportedTypes : undefined
    };
  }

  moduleRegistry.registerModule("documentTableParser", {
    parseTableElement
  });
})();
