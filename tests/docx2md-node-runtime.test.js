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
    <w:drawing/>
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
</Relationships>`
      )
    }
  ]);
}

describe("docx2md node runtime", () => {
  it("loads the core api and parses a minimal docx document", async () => {
    const api = loadDocx2mdNodeApi({
      rootDir: path.resolve(__dirname, "..")
    });
    expect(globalThis.__docx2mdModuleRegistry?.getModule("docx2md")).toBe(api);

    const parsed = await api.parseDocx(createMinimalDocxArrayBuffer());
    const markdown = api.renderMarkdown(parsed);
    const debugMarkdown = api.renderMarkdown(parsed, {
      includeUnsupportedComments: true
    });
    const summary = api.createSummary(parsed);

    expect(parsed.blocks).toHaveLength(12);
    expect(parsed.blocks[0]).toMatchObject({ kind: "heading", level: 1, text: "Section Title", anchorIds: ["section-1"] });
    expect(parsed.blocks[1]).toMatchObject({ kind: "paragraph", text: "Second Section", anchorIds: ["section-2:-intro-notes"] });
    expect(parsed.blocks[7]).toMatchObject({ kind: "listItem", listKind: "bullet", indent: 0, text: "Bullet top" });
    expect(parsed.blocks[8]).toMatchObject({ kind: "listItem", listKind: "bullet", indent: 1, text: "Bullet nested" });
    expect(parsed.blocks[9]).toMatchObject({ kind: "listItem", listKind: "ordered", indent: 0, text: "Ordered top" });
    expect(parsed.blocks[10]).toMatchObject({
      kind: "table",
      rows: [
        ["H1", "H2", "H3"],
        ["Wide", "←M←", "R2C3"],
        ["Vertical", "Mid<br><br>- Cell bullet<br><br>&nbsp;&nbsp;&nbsp;&nbsp;- Nested bullet", "R3C3"],
        ["↑M↑", "Bottom", "R4C3"]
      ]
    });
    expect(parsed.blocks[11]).toMatchObject({ kind: "unsupported", type: "drawing" });
    expect(markdown).toContain("Hello world");
    expect(markdown).toContain('<a id="section-1"></a>');
    expect(markdown).toContain('<a id="section-2:-intro-notes"></a>');
    expect(markdown).toContain("# Section Title");
    expect(markdown).toContain("Second Section");
    expect(markdown).toContain("***~~<ins>Styled</ins>~~***<br>line");
    expect(markdown).toContain("[OpenAI](https://openai.com)");
    expect(markdown).toContain("[Jump](#section-1)");
    expect(markdown).toContain("[Jump 2](#section-2:-intro-notes)");
    expect(markdown).toContain("- Bullet top");
    expect(markdown).toContain("    - Bullet nested");
    expect(markdown).toContain("1. Ordered top");
    expect(markdown).toContain("| H1 | H2 | H3 |");
    expect(markdown).toContain("| Wide | ←M← | R2C3 |");
    expect(markdown).toContain("| Vertical | Mid<br><br>- Cell bullet<br><br>&nbsp;&nbsp;&nbsp;&nbsp;- Nested bullet | R3C3 |");
    expect(markdown).toContain("| ↑M↑ | Bottom | R4C3 |");
    expect(markdown).not.toContain("<!-- unsupported:");
    expect(debugMarkdown).toContain("<!-- unsupported: drawing -->");
    expect(summary).toMatchObject({
      paragraphs: 6,
      headings: 1,
      listItems: 3,
      tables: 1,
      links: 3,
      internalLinks: 2,
      externalLinks: 1,
      unsupportedElements: 1,
      unsupportedCommentTraces: 1
    });
  });
});
