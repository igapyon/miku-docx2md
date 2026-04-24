// @vitest-environment node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadDocx2mdNodeApi } from "../scripts/lib/docx2md-node-runtime.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createStoredZip(entries) {
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, 0, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localChunks.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, 0, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralChunks.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectoryOffset = offset;
  let centralDirectorySize = 0;
  for (const chunk of centralChunks) {
    centralDirectorySize += chunk.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralDirectorySize, true);
  eocdView.setUint32(16, centralDirectoryOffset, true);
  eocdView.setUint16(20, 0, true);

  const totalLength = localChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    + centralChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    + eocd.length;
  const out = new Uint8Array(totalLength);
  let cursor = 0;
  for (const chunk of localChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  for (const chunk of centralChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  out.set(eocd, cursor);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

function createMinimalDocxArrayBuffer() {
  const encoder = new TextEncoder();
  return createStoredZip([
    {
      name: "word/document.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:bookmarkStart w:id="1" w:name="section-1"/>
      <w:r><w:t>Section Title</w:t></w:r>
    </w:p>
    <w:p>
      <w:bookmarkStart w:id="2" w:name=" Section 2: Intro / Notes "/>
      <w:r><w:t>Second Section</w:t></w:r>
      <w:pict/>
      <w:txbxContent>
        <w:p><w:r><w:t>Textbox line 1</w:t></w:r></w:p>
        <w:p>
          <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
          <w:r><w:t>Textbox heading</w:t></w:r>
        </w:p>
      </w:txbxContent>
    </w:p>
    <w:p>
      <w:r><w:t>Hello</w:t></w:r>
      <w:r><w:t xml:space="preserve"> world</w:t></w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:i/><w:strike/><w:u/></w:rPr>
        <w:t>Styled</w:t>
      </w:r>
      <w:r><w:br/></w:r>
      <w:r><w:t>line</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="EmphasisPara"/>
        <w:rPr><w:b w:val="0"/></w:rPr>
      </w:pPr>
      <w:r><w:t>Inherited para style</w:t></w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rStyle w:val="UnderlineChar"/>
          <w:i w:val="0"/>
        </w:rPr>
        <w:t>Char styled</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:hyperlink r:id="rId1">
        <w:r><w:t>OpenAI</w:t></w:r>
      </w:hyperlink>
    </w:p>
    <w:p>
      <w:hyperlink w:anchor="section-1">
        <w:r><w:t>Jump</w:t></w:r>
      </w:hyperlink>
    </w:p>
    <w:p>
      <w:hyperlink w:anchor=" Section 2: Intro / Notes ">
        <w:r><w:t>Jump 2</w:t></w:r>
      </w:hyperlink>
    </w:p>
    <w:p>
      <w:hyperlink w:anchor="missing-anchor">
        <w:r><w:t>Missing Jump</w:t></w:r>
      </w:hyperlink>
    </w:p>
    <w:p>
      <w:hyperlink r:id="rIdInternalKnown">
        <w:r><w:t>Relationship Jump</w:t></w:r>
      </w:hyperlink>
    </w:p>
    <w:p>
      <w:hyperlink r:id="rIdInternalMissing">
        <w:r><w:t>Missing Relationship Jump</w:t></w:r>
      </w:hyperlink>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="0"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Bullet top</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="1"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Bullet nested</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="0"/>
          <w:numId w:val="2"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Ordered top</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>H1</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>H2</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>H3</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p>
            <w:bookmarkStart w:id="3" w:name="cell-anchor"/>
            <w:r><w:t>Cell Anchor</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:p>
            <w:hyperlink w:anchor="cell-anchor">
              <w:r><w:t>Cell Jump</w:t></w:r>
            </w:hyperlink>
          </w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Cell End</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
          <w:p><w:r><w:t>Wide</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>R2C3</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:vMerge w:val="restart"/></w:tcPr>
          <w:p><w:r><w:t>Vertical</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Mid</w:t></w:r></w:p>
          <w:p>
            <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
            <w:r><w:t>Cell Heading</w:t></w:r>
            <w:object/>
          </w:p>
          <w:p>
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="0"/>
                <w:numId w:val="1"/>
              </w:numPr>
            </w:pPr>
            <w:r><w:t>Cell bullet</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="1"/>
                <w:numId w:val="1"/>
              </w:numPr>
            </w:pPr>
            <w:r><w:t>Nested bullet</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>R3C3</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:vMerge/></w:tcPr>
          <w:p/>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Bottom</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>R4C3</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:drawing>
      <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:docPr id="1" name="Sample image" descr="Sample image alt"/>
        <wp:extent cx="914400" cy="457200"/>
      </wp:inline>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData>
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:blipFill>
              <a:blip r:embed="rIdImage1"/>
            </pic:blipFill>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </w:drawing>
    <w:chart/>
  </w:body>
</w:document>`
      )
    },
    {
      name: "word/styles.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BaseBoldPara">
    <w:name w:val="Base Bold Para"/>
    <w:rPr><w:b/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="EmphasisPara">
    <w:name w:val="Emphasis Para"/>
    <w:basedOn w:val="BaseBoldPara"/>
    <w:rPr><w:i/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="BaseItalicChar">
    <w:name w:val="Base Italic Char"/>
    <w:rPr><w:i/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="StrikeChar">
    <w:name w:val="Strike Char"/>
    <w:basedOn w:val="BaseItalicChar"/>
    <w:rPr><w:strike/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="UnderlineChar">
    <w:name w:val="Underline Char"/>
    <w:basedOn w:val="StrikeChar"/>
    <w:rPr><w:u/></w:rPr>
  </w:style>
</w:styles>`
      )
    },
    {
      name: "word/numbering.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="10">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>
    <w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/><w:lvlText w:val="◦"/></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="20">
    <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="10"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="20"/></w:num>
</w:numbering>`
      )
    },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://openai.com" TargetMode="External"/>
  <Relationship Id="rIdInternalKnown" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="#section-1"/>
  <Relationship Id="rIdInternalMissing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="#missing-anchor"/>
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sample-image.png"/>
</Relationships>`
      )
    },
    {
      name: "word/media/sample-image.png",
      data: Uint8Array.from([1, 2, 3, 4])
    }
  ]);
}

function createContentTypeResolvedDocxArrayBuffer() {
  const encoder = new TextEncoder();
  return createStoredZip([
    {
      name: "[Content_Types].xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="bin" ContentType="image/png"/>
</Types>`
      )
    },
    {
      name: "word/document.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:drawing>
      <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:docPr id="1" name="Typed image" descr="Typed asset"/>
      </wp:inline>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData>
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:blipFill>
              <a:blip r:embed="rIdImage1"/>
            </pic:blipFill>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </w:drawing>
  </w:body>
</w:document>`
      )
    },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/typed-image.bin"/>
</Relationships>`
      )
    },
    {
      name: "word/media/typed-image.bin",
      data: Uint8Array.from([9, 8, 7, 6])
    }
  ]);
}

function createImageAltWithParenthesisDocxArrayBuffer() {
  const encoder = new TextEncoder();
  return createStoredZip([
    {
      name: "word/document.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:drawing>
      <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:extent cx="111" cy="222"/>
        <wp:docPr id="1" name="Image" descr="Alt (draft) text"/>
      </wp:inline>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData>
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:blipFill>
              <a:blip r:embed="rIdImage1"/>
            </pic:blipFill>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </w:drawing>
  </w:body>
</w:document>`
      )
    },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/paren-alt.png"/>
</Relationships>`
      )
    },
    {
      name: "word/media/paren-alt.png",
      data: Uint8Array.from([5, 6, 7, 8])
    }
  ]);
}

function createImagePathWithMarkdownSpecialCharsDocxArrayBuffer() {
  const encoder = new TextEncoder();
  return createStoredZip([
    {
      name: "word/document.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:drawing>
      <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:docPr id="1" name="Image" descr="Path image"/>
      </wp:inline>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData>
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:blipFill>
              <a:blip r:embed="rIdImage1"/>
            </pic:blipFill>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </w:drawing>
  </w:body>
</w:document>`
      )
    },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/my image (final).png"/>
</Relationships>`
      )
    },
    {
      name: "word/media/my image (final).png",
      data: Uint8Array.from([7, 6, 5, 4])
    }
  ]);
}

function createImageAltWithMarkdownSpecialCharsDocxArrayBuffer() {
  const encoder = new TextEncoder();
  return createStoredZip([
    {
      name: "word/document.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:drawing>
      <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:docPr id="1" name="Image" descr="Alt [draft]
text"/>
      </wp:inline>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData>
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:blipFill>
              <a:blip r:embed="rIdImage1"/>
            </pic:blipFill>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </w:drawing>
  </w:body>
</w:document>`
      )
    },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/alt-special.png"/>
</Relationships>`
      )
    },
    {
      name: "word/media/alt-special.png",
      data: Uint8Array.from([1, 3, 5, 7])
    }
  ]);
}

function createDuplicateAnchorDocxArrayBuffer() {
  const encoder = new TextEncoder();
  return createStoredZip([
    {
      name: "word/document.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:bookmarkStart w:id="1" w:name="Section 1"/>
      <w:r><w:t>First owner</w:t></w:r>
    </w:p>
    <w:p>
      <w:bookmarkStart w:id="2" w:name="section-1"/>
      <w:r><w:t>Duplicate owner</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`
      )
    }
  ]);
}

describe("docx2md node runtime", () => {
  it("keeps fragment-only relationship targets as document anchors", () => {
    loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });
    const relsParser = globalThis.__docx2mdModuleRegistry?.getModule("relsParser");
    const encoder = new TextEncoder();
    const relationships = relsParser.parseRelationships(
      encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdAnchor" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="#section-1"/>
  <Relationship Id="rIdMedia" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image.png"/>
</Relationships>`
      ),
      "word/document.xml"
    );

    expect(relsParser.resolveZipPath("word/document.xml", "#section-1")).toBe("#section-1");
    expect(relationships.get("rIdAnchor")).toMatchObject({ target: "#section-1" });
    expect(relationships.get("rIdMedia")).toMatchObject({ target: "word/media/image.png" });
  });

  it("emits duplicate normalized bookmark anchors only once", async () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });

    const parsed = await api.parseDocx(createDuplicateAnchorDocxArrayBuffer());
    const markdown = api.renderMarkdown(parsed);

    expect(parsed.blocks[0]).toMatchObject({
      kind: "paragraph",
      text: "First owner",
      anchorIds: ["section-1"]
    });
    expect(parsed.blocks[1]).toMatchObject({
      kind: "paragraph",
      text: "Duplicate owner",
      anchorIds: []
    });
    expect(markdown.match(/<a id="section-1"><\/a>/g)).toHaveLength(1);
  });

  it("escapes unsupported trace text inside debug HTML comments", () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });

    const markdown = api.renderMarkdown({
      blocks: [
        {
          kind: "paragraph",
          text: "Trace owner",
          unsupportedTypes: ["drawing:metadata(Bad --> alt -- value)"]
        },
        {
          kind: "unsupported",
          type: "chart --> bad -- value"
        }
      ]
    }, {
      includeUnsupportedComments: true
    });

    expect(markdown).toContain("<!-- unsupported: drawing:metadata(Bad - -&gt; alt - - value) -->");
    expect(markdown).toContain("<!-- unsupported: chart - -&gt; bad - - value -->");
    expect(markdown).not.toContain("Bad --> alt");
    expect(markdown).not.toContain("chart --> bad");
  });

  it("extracts image assets when alt text contains closing parentheses", async () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });

    const parsed = await api.parseDocx(createImageAltWithParenthesisDocxArrayBuffer());
    const markdown = api.renderMarkdown(parsed);
    const markdownWithAssets = api.renderMarkdown(parsed, {
      imagePathResolver: (sourcePath) => `./assets/${sourcePath}`
    });
    const assetsManifest = JSON.parse(api.createAssetsManifestText(parsed));

    expect(markdown).toContain("[Image: Alt (draft) text]");
    expect(markdownWithAssets).toContain("![Alt (draft) text](./assets/word/media/paren-alt.png)");
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0]).toMatchObject({
      sourcePath: "word/media/paren-alt.png",
      altText: "Alt (draft) text",
      sourceTrace: "drawing:image(word/media/paren-alt.png):alt(Alt (draft) text):size-emu(111x222)"
    });
    expect(assetsManifest.assets[0]).toMatchObject({
      sourcePath: "word/media/paren-alt.png",
      altText: "Alt (draft) text",
      sourceTrace: "drawing:image(word/media/paren-alt.png):alt(Alt (draft) text):size-emu(111x222)"
    });
  });

  it("escapes generated Markdown image destinations when asset paths contain spaces or parentheses", async () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });

    const parsed = await api.parseDocx(createImagePathWithMarkdownSpecialCharsDocxArrayBuffer());
    const markdown = api.renderMarkdown(parsed, {
      imagePathResolver: (sourcePath) => `./assets/${sourcePath}`
    });

    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0]).toMatchObject({
      sourcePath: "word/media/my image (final).png",
      altText: "Path image"
    });
    expect(markdown).toContain("![Path image](./assets/word/media/my%20image%20%28final%29.png)");
  });

  it("normalizes image alt text for Markdown image syntax and placeholders", async () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });

    const parsed = await api.parseDocx(createImageAltWithMarkdownSpecialCharsDocxArrayBuffer());
    const markdown = api.renderMarkdown(parsed);
    const markdownWithAssets = api.renderMarkdown(parsed, {
      imagePathResolver: (sourcePath) => `./assets/${sourcePath}`
    });

    expect(parsed.assets[0]).toMatchObject({
      sourcePath: "word/media/alt-special.png",
      altText: "Alt [draft] text"
    });
    expect(markdown).toContain("[Image: Alt [draft] text]");
    expect(markdownWithAssets).toContain("![Alt draft text](./assets/word/media/alt-special.png)");
  });

  it("loads the core api and parses a minimal docx document", async () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });
    expect(globalThis.__docx2mdModuleRegistry?.getModule("docx2md")).toBe(api);

    const parsed = await api.parseDocx(createMinimalDocxArrayBuffer());
    const markdown = api.renderMarkdown(parsed);
    const markdownWithAssets = api.renderMarkdown(parsed, {
      imagePathResolver: (sourcePath) => `./exported-assets/${sourcePath}`
    });
    const debugMarkdown = api.renderMarkdown(parsed, {
      includeUnsupportedComments: true
    });
    const summary = api.createSummary(parsed);
    const assetsManifest = JSON.parse(api.createAssetsManifestText(parsed));

    expect(parsed.blocks).toHaveLength(18);
    expect(parsed.blocks[0]).toMatchObject({ kind: "heading", level: 1, text: "Section Title", anchorIds: ["section-1"] });
    expect(parsed.blocks[1]).toMatchObject({
      kind: "paragraph",
      text: "Second Section<br><br>Textbox line 1<br><br>## Textbox heading",
      anchorIds: ["section-2:-intro-notes"],
      unsupportedTypes: ["drawing"]
    });
    expect(parsed.blocks[9]).toMatchObject({ kind: "paragraph", text: "Missing Jump" });
    expect(parsed.blocks[10]).toMatchObject({ kind: "paragraph", text: "[Relationship Jump](#section-1)" });
    expect(parsed.blocks[11]).toMatchObject({ kind: "paragraph", text: "Missing Relationship Jump" });
    expect(parsed.blocks[12]).toMatchObject({ kind: "listItem", listKind: "bullet", indent: 0, text: "Bullet top" });
    expect(parsed.blocks[13]).toMatchObject({ kind: "listItem", listKind: "bullet", indent: 1, text: "Bullet nested" });
    expect(parsed.blocks[14]).toMatchObject({ kind: "listItem", listKind: "ordered", indent: 0, text: "Ordered top" });
    expect(parsed.blocks[15]).toMatchObject({
      kind: "table",
      unsupportedTypes: ["drawing"],
      rows: [
        ["H1", "H2", "H3"],
        ["Cell Anchor", "Cell Jump", "Cell End"],
        ["Wide", "←M←", "R2C3"],
        ["Vertical", "Mid<br><br>## Cell Heading<br><br>- Cell bullet<br><br>&nbsp;&nbsp;&nbsp;&nbsp;- Nested bullet", "R3C3"],
        ["↑M↑", "Bottom", "R4C3"]
      ]
    });
    expect(parsed.blocks[16]).toMatchObject({ kind: "unsupported", type: "drawing:image(word/media/sample-image.png):alt(Sample image alt):size-emu(914400x457200)" });
    expect(parsed.blocks[17]).toMatchObject({ kind: "unsupported", type: "chart" });
    expect(markdown).toContain("Hello world");
    expect(markdown).toContain('<a id="section-1"></a>');
    expect(markdown).toContain('<a id="section-2:-intro-notes"></a>');
    expect(markdown).toContain("# Section Title");
    expect(markdown).toContain("Second Section<br><br>Textbox line 1<br><br>## Textbox heading");
    expect(markdown).toContain("***~~<ins>Styled</ins>~~***<br>line");
    expect(markdown).toContain("*Inherited para style*");
    expect(markdown).toContain("~~<ins>Char styled</ins>~~");
    expect(markdown).toContain("[OpenAI](https://openai.com)");
    expect(markdown).toContain("[Jump](#section-1)");
    expect(markdown).toContain("[Jump 2](#section-2:-intro-notes)");
    expect(markdown).toContain("Missing Jump");
    expect(markdown).not.toContain("[Missing Jump](#missing-anchor)");
    expect(markdown).toContain("[Relationship Jump](#section-1)");
    expect(markdown).toContain("Missing Relationship Jump");
    expect(markdown).not.toContain("[Missing Relationship Jump](#missing-anchor)");
    expect(markdown).toContain("- Bullet top");
    expect(markdown).toContain("    - Bullet nested");
    expect(markdown).toContain("1. Ordered top");
    expect(markdown).toContain("| H1 | H2 | H3 |");
    expect(markdown).toContain("| Cell Anchor | Cell Jump | Cell End |");
    expect(markdown).not.toContain("[Cell Jump](#cell-anchor)");
    expect(markdown).toContain("| Wide | ←M← | R2C3 |");
    expect(markdown).toContain("| Vertical | Mid<br><br>## Cell Heading<br><br>- Cell bullet<br><br>&nbsp;&nbsp;&nbsp;&nbsp;- Nested bullet | R3C3 |");
    expect(markdown).toContain("| ↑M↑ | Bottom | R4C3 |");
    expect(markdown).toContain("[Image: Sample image alt]");
    expect(markdownWithAssets).toContain("![Sample image alt](./exported-assets/word/media/sample-image.png)");
    expect(markdown).not.toContain("<!-- unsupported:");
    expect(debugMarkdown).toContain("Second Section<br><br>Textbox line 1<br><br>## Textbox heading\n<!-- unsupported: drawing -->");
    expect(debugMarkdown).toContain("| ↑M↑ | Bottom | R4C3 |\n<!-- unsupported: drawing -->");
    expect(debugMarkdown).toContain("<!-- unsupported: drawing:image(word/media/sample-image.png):alt(Sample image alt):size-emu(914400x457200) -->");
    expect(debugMarkdown).toContain("<!-- unsupported: chart -->");
    expect(summary).toMatchObject({
      paragraphs: 11,
      headings: 1,
      listItems: 3,
      tables: 1,
      images: 1,
      imageAssets: 1,
      drawingLikeUnsupported: 3,
      links: 4,
      internalLinks: 3,
      externalLinks: 1,
      unsupportedElements: 4,
      unsupportedCommentTraces: 4
    });
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0]).toMatchObject({
      kind: "image",
      sourcePath: "word/media/sample-image.png",
      mediaType: "image/png",
      altText: "Sample image alt",
      sourceTrace: "drawing:image(word/media/sample-image.png):alt(Sample image alt):size-emu(914400x457200)",
      blockIndex: 16,
      documentPosition: {
        blockIndex: 16,
        blockKind: "unsupported",
        traceIndex: 0
      }
    });
    expect(Array.from(parsed.assets[0].bytes)).toEqual([1, 2, 3, 4]);
    expect(assetsManifest).toEqual({
      version: 1,
      assets: [
        {
          kind: "image",
          sourcePath: "word/media/sample-image.png",
          mediaType: "image/png",
          altText: "Sample image alt",
          sourceTrace: "drawing:image(word/media/sample-image.png):alt(Sample image alt):size-emu(914400x457200)",
          blockIndex: 16,
          documentPosition: {
            blockIndex: 16,
            blockKind: "unsupported",
            traceIndex: 0
          },
          size: 4
        }
      ]
    });
  });

  it("resolves exported image media types from [Content_Types].xml when available", async () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });

    const parsed = await api.parseDocx(createContentTypeResolvedDocxArrayBuffer());
    const markdown = api.renderMarkdown(parsed, {
      imagePathResolver: (sourcePath) => `./assets/${sourcePath}`
    });

    expect(parsed.summary).toMatchObject({
      images: 1,
      imageAssets: 1,
      drawingLikeUnsupported: 1
    });
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0]).toMatchObject({
      sourcePath: "word/media/typed-image.bin",
      mediaType: "image/png",
      altText: "Typed asset",
      sourceTrace: "drawing:image(word/media/typed-image.bin):alt(Typed asset)",
      blockIndex: 0,
      documentPosition: {
        blockIndex: 0,
        blockKind: "unsupported",
        traceIndex: 0
      }
    });
    expect(Array.from(parsed.assets[0].bytes)).toEqual([9, 8, 7, 6]);
    expect(markdown).toContain("![Typed asset](./assets/word/media/typed-image.bin)");
  });
});
