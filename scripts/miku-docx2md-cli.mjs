import fs from "node:fs/promises";
import path from "node:path";

import { loadDocx2mdNodeApi } from "./lib/docx2md-node-runtime.mjs";

function printHelp() {
  console.log(`miku-docx2md - local-first DOCX to Markdown converter

USAGE
  node scripts/miku-docx2md-cli.mjs <input.docx> [options]
  node scripts/miku-docx2md-cli.mjs --version
  node scripts/miku-docx2md-cli.mjs --help

CONTRACT
  Input is exactly one local .docx file path.
  Primary output is Markdown.
  If --out is set, Markdown is written to that file.
  If --out is omitted, Markdown is written to stdout.
  --summary prints conversion summary text to stdout.
  --summary-out writes conversion summary text to a file.
  If --out is omitted, avoid --summary unless mixed stdout output is acceptable.
  --help and --version are metadata commands and must be used without other arguments.

OPTIONS
  --out <file>
      Write Markdown to this file. Parent directories are created.

  --assets-dir <dir>
      Export resolved embedded image assets into this directory.
      Also writes <dir>/manifest.json.
      Markdown image links are made relative to --out, or to the current directory
      when --out is omitted.

  --summary
      Print summary text to stdout.

  --summary-out <file>
      Write summary text to this file. Parent directories are created.

  --debug
      Include unsupported-element HTML comment traces in Markdown.

  --include-unsupported-comments
      Alias for --debug.

  --version
      Show product name and package version, then exit.

  --help
      Show this help, then exit.

OUTPUTS
  Markdown:
      Main converted document structure.

  Summary:
      Text counts and diagnostics for converted document content.

  Asset directory:
      Contains resolved embedded image files at package-relative paths such as
      word/media/example.png, plus manifest.json.

  Asset manifest:
      JSON with asset path, media type, alt text, byte size, source trace,
      block index, and document position.

EXAMPLES
  Write Markdown to a file:
    node scripts/miku-docx2md-cli.mjs ./sample.docx --out ./sample.md

  Print Markdown to stdout:
    node scripts/miku-docx2md-cli.mjs ./sample.docx

  Write Markdown and summary files:
    node scripts/miku-docx2md-cli.mjs ./sample.docx --out ./sample.md --summary-out ./sample.summary.txt

  Write Markdown and export image assets:
    node scripts/miku-docx2md-cli.mjs ./sample.docx --out ./sample.md --assets-dir ./sample.assets

  Include unsupported-element debug traces:
    node scripts/miku-docx2md-cli.mjs ./sample.docx --out ./sample.md --debug

  Show version:
    node scripts/miku-docx2md-cli.mjs --version

EXIT CODES
  0  Success, or explicit metadata command such as --version / --help.
  1  CLI usage error, file I/O error, parse error, or unexpected runtime error.
`);
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
  return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--help") {
    return { help: true };
  }
  if (argv.length === 1 && argv[0] === "--version") {
    return { version: true };
  }
  if (argv.includes("--help") || argv.includes("--version")) {
    throw new Error("Use --help or --version without other arguments.");
  }

  const options = {
    inputPath: null,
    outPath: null,
    assetsDir: null,
    summaryOutPath: null,
    summary: false,
    includeUnsupportedComments: false
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    if (arg === "--summary") {
      options.summary = true;
      continue;
    }
    if (arg === "--debug" || arg === "--include-unsupported-comments") {
      options.includeUnsupportedComments = true;
      continue;
    }
    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --out");
      }
      index += 1;
      options.outPath = value;
      continue;
    }
    if (arg === "--assets-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --assets-dir");
      }
      index += 1;
      options.assetsDir = value;
      continue;
    }
    if (arg === "--summary-out") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --summary-out");
      }
      index += 1;
      options.summaryOutPath = value;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (positionals.length === 1) {
    [options.inputPath] = positionals;
  } else if (positionals.length > 1) {
    throw new Error("Specify exactly one input .docx file.");
  }

  return options;
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function writeTextFile(outputPath, content) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, "utf8");
}

async function writeBinaryFile(outputPath, content) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.version) {
    const version = await readPackageVersion();
    console.log(`miku-docx2md ${version}`);
    process.exit(0);
  }

  if (options.help || !options.inputPath) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const api = loadDocx2mdNodeApi();
  const inputPath = path.resolve(options.inputPath);
  const inputBytes = await fs.readFile(inputPath);
  const parsed = await api.parseDocx(toArrayBuffer(inputBytes));
  const resolvedOutputPath = options.outPath ? path.resolve(options.outPath) : null;
  const resolvedAssetsDir = options.assetsDir ? path.resolve(options.assetsDir) : null;
  const markdown = api.renderMarkdown(parsed, {
    includeUnsupportedComments: options.includeUnsupportedComments,
    imagePathResolver: resolvedAssetsDir
      ? (sourcePath) => {
        const exportedAssetPath = path.join(resolvedAssetsDir, sourcePath);
        const relativeBase = resolvedOutputPath
          ? path.dirname(resolvedOutputPath)
          : process.cwd();
        return toPosixPath(path.relative(relativeBase, exportedAssetPath) || path.basename(exportedAssetPath));
      }
      : undefined
  });
  const summaryText = api.createSummaryText(parsed);
  const assetsManifestText = api.createAssetsManifestText(parsed);

  if (resolvedAssetsDir) {
    await writeTextFile(path.join(resolvedAssetsDir, "manifest.json"), assetsManifestText);
    for (const asset of parsed.assets || []) {
      await writeBinaryFile(path.join(resolvedAssetsDir, asset.sourcePath), asset.bytes);
    }
  }

  if (options.summary) {
    console.log(summaryText);
  }

  if (options.summaryOutPath) {
    await writeTextFile(path.resolve(options.summaryOutPath), summaryText);
  }

  if (resolvedOutputPath) {
    await writeTextFile(resolvedOutputPath, markdown);
  } else {
    process.stdout.write(markdown);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
