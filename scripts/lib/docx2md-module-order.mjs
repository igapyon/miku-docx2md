export const DOCX2MD_CORE_JS_ORDER = [
  "dist/js/module-registry.js",
  "dist/js/zip-io.js",
  "dist/js/xml-utils.js",
  "dist/js/rels-parser.js",
  "dist/js/styles-parser.js",
  "dist/js/numbering-parser.js",
  "dist/js/document-summary.js",
  "dist/js/document-anchor-parser.js",
  "dist/js/document-drawing-parser.js",
  "dist/js/document-text-style-parser.js",
  "dist/js/document-hyperlink-parser.js",
  "dist/js/document-paragraph-parser.js",
  "dist/js/document-inline-parser.js",
  "dist/js/document-cell-parser.js",
  "dist/js/document-table-parser.js",
  "dist/js/document-block-parser.js",
  "dist/js/document-parser.js",
  "dist/js/image-trace.js",
  "dist/js/asset-path.js",
  "dist/js/docx-assets.js",
  "dist/js/markdown-renderer.js",
  "dist/js/summary.js",
  "dist/js/asset-manifest.js",
  "dist/js/docx-package-loader.js",
  "dist/js/core.js"
];

export const DOCX2MD_CORE_TS_ORDER = DOCX2MD_CORE_JS_ORDER.map((relPath) =>
  relPath.replace(/^dist\/js\//, "src/ts/").replace(/\.js$/, ".ts")
);
