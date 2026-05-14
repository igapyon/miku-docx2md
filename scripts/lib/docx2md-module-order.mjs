export const DOCX2MD_CORE_JS_ORDER = [
  "src/js/module-registry.js",
  "src/js/zip-io.js",
  "src/js/xml-utils.js",
  "src/js/rels-parser.js",
  "src/js/styles-parser.js",
  "src/js/numbering-parser.js",
  "src/js/document-summary.js",
  "src/js/document-anchor-parser.js",
  "src/js/document-drawing-parser.js",
  "src/js/document-text-style-parser.js",
  "src/js/document-hyperlink-parser.js",
  "src/js/document-paragraph-parser.js",
  "src/js/document-inline-parser.js",
  "src/js/document-cell-parser.js",
  "src/js/document-table-parser.js",
  "src/js/document-block-parser.js",
  "src/js/document-parser.js",
  "src/js/image-trace.js",
  "src/js/asset-path.js",
  "src/js/docx-assets.js",
  "src/js/markdown-renderer.js",
  "src/js/summary.js",
  "src/js/asset-manifest.js",
  "src/js/docx-package-loader.js",
  "src/js/core.js"
];

export const DOCX2MD_CORE_TS_ORDER = DOCX2MD_CORE_JS_ORDER.map((relPath) =>
  relPath.replace(/^src\/js\//, "src/ts/").replace(/\.js$/, ".ts")
);
