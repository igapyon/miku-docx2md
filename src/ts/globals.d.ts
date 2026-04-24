type Docx2mdModuleRegistry = {
  registerModule: (name: string, moduleApi: unknown) => void;
  getModule: <T>(name: string) => T | null;
};

type Docx2mdParsedBlock =
  | {
    kind: "paragraph" | "heading" | "listItem";
    text: string;
    level?: number;
    listKind?: "bullet" | "ordered";
    indent?: number;
    anchorIds?: string[];
    unsupportedTypes?: string[];
  }
  | {
    kind: "unsupported";
    type: string;
  }
  | {
    kind: "table";
    rows: string[][];
    unsupportedTypes?: string[];
  };

type Docx2mdParsedSummary = {
  paragraphs: number;
  headings: number;
  listItems: number;
  tables: number;
  images: number;
  imageAssets: number;
  drawingLikeUnsupported: number;
  links: number;
  internalLinks: number;
  externalLinks: number;
  unsupportedElements: number;
  unsupportedCommentTraces: number;
};

type Docx2mdParsedDocument = {
  blocks: Docx2mdParsedBlock[];
  summary: Docx2mdParsedSummary;
};

type Docx2mdParsedImageAsset = {
  kind: "image";
  sourcePath: string;
  mediaType: string;
  altText: string;
  sourceTrace: string;
  blockIndex: number;
  documentPosition: {
    blockIndex: number;
    blockKind: "paragraph" | "heading" | "listItem" | "table" | "unsupported";
    traceIndex: number;
  };
  bytes: Uint8Array;
};

type Docx2mdParsedDocx = Docx2mdParsedDocument & {
  assets: Docx2mdParsedImageAsset[];
};

type Docx2mdLoadedPackage = {
  files: Map<string, Uint8Array>;
  documentXmlBytes: Uint8Array;
  relationshipsBytes?: Uint8Array;
  stylesBytes?: Uint8Array;
  numberingBytes?: Uint8Array;
  contentTypesBytes?: Uint8Array;
};

type Docx2mdMarkdownRenderOptions = {
  includeUnsupportedComments?: boolean;
  imagePathResolver?: (sourcePath: string) => string;
};

type Docx2mdParsedAssetDocument = {
  assets: Docx2mdParsedImageAsset[];
};

type Docx2mdParsedStyle = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
};

type Docx2mdParsedStyleOverride = {
  bold: boolean | null;
  italic: boolean | null;
  strike: boolean | null;
  underline: boolean | null;
};

type Docx2mdParsedStyleDefinition = {
  styleId: string;
  styleType: string;
  name: string;
  basedOn: string;
  outlineLevel: number | null;
  textStyle: Docx2mdParsedStyleOverride;
};

type Docx2mdRelationship = {
  target: string;
  type: string;
  mode: string;
};

type Docx2mdNumberingLevel = {
  level: number;
  format: string;
  text: string;
};

type Docx2mdAbstractNumberingDefinition = {
  abstractNumId: string;
  levels: Map<number, Docx2mdNumberingLevel>;
};

type Docx2mdNumberingDefinition = {
  abstractNums: Map<string, Docx2mdAbstractNumberingDefinition>;
  nums: Map<string, string>;
};

type Docx2mdParseContext = {
  summary: Docx2mdParsedSummary;
  knownAnchorIds: Set<string>;
};

type Docx2mdStructuredParagraphRenderer = (
  paragraph: Element,
  text: string,
  styles: Map<string, Docx2mdParsedStyleDefinition>,
  numbering: Docx2mdNumberingDefinition,
  unsupportedTypes: string[]
) => string;

declare function getDocx2mdModuleRegistry(): Docx2mdModuleRegistry;

interface GlobalThis {
  __docx2mdModuleRegistry?: Docx2mdModuleRegistry;
  getDocx2mdModuleRegistry?: () => Docx2mdModuleRegistry;
}
