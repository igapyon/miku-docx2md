import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const bundlePath = "bundle/miku-docx2md.mjs";

async function runBundle(args) {
  return execFileAsync(process.execPath, [bundlePath, ...args], {
    encoding: "utf8"
  });
}

async function main() {
  const version = await runBundle(["--version"]);
  if (!version.stdout.startsWith("miku-docx2md ")) {
    throw new Error(`Unexpected bundle version output: ${version.stdout}`);
  }

  const help = await runBundle(["--help"]);
  if (!help.stdout.includes("miku-docx2md - local-first DOCX to Markdown converter")) {
    throw new Error("Bundle help output did not include the expected product heading.");
  }

  const conversion = await runBundle(["tests/fixtures/docx/word-headings-basic.docx"]);
  if (!conversion.stdout.includes("# Heading 1") || !conversion.stdout.includes("###### Heading 6")) {
    throw new Error("Bundle conversion smoke output did not include expected headings.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
