import fs from "node:fs/promises";
import path from "node:path";

import { loadDocx2mdNodeApi } from "./lib/docx2md-node-runtime.mjs";

const FLAG_OPTIONS = {
  "--summary"(options) {
    options.summary = true;
  },
  "--debug"(options) {
    options.includeUnsupportedComments = true;
  },
  "--include-unsupported-comments"(options) {
    options.includeUnsupportedComments = true;
  },
  "--verbose"(options) {
    options.verbose = true;
  }
};

const VALUE_OPTIONS = {
  "--out": {
    apply(options, value) {
      options.outPath = value;
    }
  },
  "--assets-dir": {
    apply(options, value) {
      options.assetsDir = value;
    }
  },
  "--summary-out": {
    apply(options, value) {
      options.summaryOutPath = value;
    }
  }
};

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
  --verbose writes progress and timing diagnostics to stderr.
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

  --verbose
      Write progress and timing diagnostics to stderr with a "verbose:" prefix.
      Primary Markdown and summary outputs are unchanged.

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

  Show progress diagnostics on stderr:
    node scripts/miku-docx2md-cli.mjs ./sample.docx --out ./sample.md --verbose

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
    includeUnsupportedComments: false,
    verbose: false
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const flagHandler = FLAG_OPTIONS[arg];
    if (flagHandler) {
      flagHandler(options);
      continue;
    }

    const valueOption = VALUE_OPTIONS[arg];
    if (valueOption) {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      valueOption.apply(options, value);
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

function createVerboseLogger(enabled, startedAt) {
  return (message) => {
    if (!enabled) return;
    const elapsedMs = Date.now() - startedAt;
    console.error(`verbose: +${elapsedMs}ms ${message}`);
  };
}

function formatDocumentError(inputPath, stage, error) {
  const inputName = path.basename(inputPath || "input.docx");
  const message = error instanceof Error ? error.message : String(error);
  return `[${inputName}] ${stage}: ${message}`;
}

function requireAssetPathApi() {
  const assetPath = globalThis.__docx2mdModuleRegistry?.getModule("assetPath");
  if (!assetPath || typeof assetPath.getSafeDocxAssetPath !== "function") {
    throw new Error("DOCX asset path module is not loaded.");
  }
  return assetPath;
}

function resolveAssetOutputPath(assetsRootDir, sourcePath, assetPathApi) {
  const safeSourcePath = assetPathApi.getSafeDocxAssetPath(sourcePath);
  if (!safeSourcePath) {
    throw new Error(`Unsafe DOCX asset path: ${sourcePath}`);
  }
  const outputPath = path.resolve(assetsRootDir, ...safeSourcePath.split("/"));
  const relativePath = path.relative(assetsRootDir, outputPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`DOCX asset path escapes assets directory: ${sourcePath}`);
  }
  return outputPath;
}

async function main() {
  const startedAt = Date.now();
  const options = parseArgs(process.argv.slice(2));
  const verbose = createVerboseLogger(options.verbose, startedAt);

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
  const assetPathApi = requireAssetPathApi();
  const inputPath = path.resolve(options.inputPath);
  const resolvedOutputPath = options.outPath ? path.resolve(options.outPath) : null;
  const resolvedAssetsDir = options.assetsDir ? path.resolve(options.assetsDir) : null;

  try {
    verbose(`input=${options.inputPath}`);
    verbose(`output=${options.outPath || "stdout"}`);
    verbose(`summary=${options.summaryOutPath || (options.summary ? "stdout" : "disabled")}`);
    verbose(`assets=${options.assetsDir || "disabled"}`);
    let inputBytes;
    try {
      inputBytes = await fs.readFile(inputPath);
    } catch (error) {
      throw new Error(formatDocumentError(inputPath, "read failed", error));
    }
    verbose(`input-bytes=${inputBytes.byteLength}`);
    let parsed;
    try {
      parsed = await api.parseDocx(toArrayBuffer(inputBytes));
    } catch (error) {
      throw new Error(formatDocumentError(inputPath, "parse failed", error));
    }
    verbose(`parsed blocks=${parsed.blocks.length} assets=${parsed.assets.length}`);
    const markdown = api.renderMarkdown(parsed, {
      includeUnsupportedComments: options.includeUnsupportedComments,
      imagePathResolver: resolvedAssetsDir
        ? (sourcePath) => {
          const safeSourcePath = assetPathApi.getSafeDocxAssetPath(sourcePath);
          if (!safeSourcePath) return "";
          const exportedAssetPath = path.resolve(resolvedAssetsDir, ...safeSourcePath.split("/"));
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
      try {
        await writeTextFile(path.join(resolvedAssetsDir, "manifest.json"), assetsManifestText);
        for (const asset of parsed.assets || []) {
          await writeBinaryFile(resolveAssetOutputPath(resolvedAssetsDir, asset.sourcePath, assetPathApi), asset.bytes);
        }
      } catch (error) {
        throw new Error(formatDocumentError(inputPath, "asset write failed", error));
      }
      verbose(`assets-written count=${parsed.assets.length}`);
    }

    if (options.summary) {
      console.log(summaryText);
      verbose("summary-written stdout");
    }

    if (options.summaryOutPath) {
      try {
        await writeTextFile(path.resolve(options.summaryOutPath), summaryText);
      } catch (error) {
        throw new Error(formatDocumentError(inputPath, "summary write failed", error));
      }
      verbose(`summary-written ${options.summaryOutPath}`);
    }

    if (resolvedOutputPath) {
      try {
        await writeTextFile(resolvedOutputPath, markdown);
      } catch (error) {
        throw new Error(formatDocumentError(inputPath, "markdown write failed", error));
      }
      verbose(`markdown-written ${options.outPath}`);
    } else {
      process.stdout.write(markdown);
      verbose("markdown-written stdout");
    }
    verbose(`done total-ms=${Date.now() - startedAt}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith(`[${path.basename(inputPath)}] `)) {
      throw error;
    }
    throw new Error(formatDocumentError(inputPath, "failed", error));
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
