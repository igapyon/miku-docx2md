import fs from "node:fs/promises";
import path from "node:path";

import { loadDocx2mdNodeApi } from "./lib/docx2md-node-runtime.mjs";

function printHelp() {
  console.log(`Usage:
  node scripts/miku-docx2md-cli.mjs <input.docx> [options]

Options:
  --out <file>                    Write Markdown to this file
  --summary                       Print summary to stdout
  --summary-out <file>            Write summary text to this file
  --debug                         Include unsupported-element HTML comments in Markdown output
  --include-unsupported-comments  Alias for --debug
  --help                          Show help and exit

Exit codes:
  0                               Success
  1                               Error
`);
}

function parseArgs(argv) {
  const options = {
    inputPath: null,
    outPath: null,
    summaryOutPath: null,
    summary: false,
    includeUnsupportedComments: false,
    help: false
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    if (arg === "--help") {
      options.help = true;
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

async function main() {
  const api = loadDocx2mdNodeApi();
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.inputPath) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const inputPath = path.resolve(options.inputPath);
  const inputBytes = await fs.readFile(inputPath);
  const parsed = await api.parseDocx(toArrayBuffer(inputBytes));
  const markdown = api.renderMarkdown(parsed, {
    includeUnsupportedComments: options.includeUnsupportedComments
  });
  const summaryText = api.createSummaryText(parsed);

  if (options.summary) {
    console.log(summaryText);
  }

  if (options.summaryOutPath) {
    await writeTextFile(path.resolve(options.summaryOutPath), summaryText);
  }

  if (options.outPath) {
    await writeTextFile(path.resolve(options.outPath), markdown);
  } else {
    process.stdout.write(markdown);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
