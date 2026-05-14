import fs from "node:fs";
import path from "node:path";

import { DOCX2MD_CORE_TS_ORDER } from "./lib/docx2md-module-order.mjs";

const ROOT = process.cwd();

const tsModule = await loadTypeScriptModule();

transpileTypeScript(DOCX2MD_CORE_TS_ORDER, tsModule);
console.log("[build:miku-docx2md] generated core src/js modules");

async function loadTypeScriptModule() {
  try {
    const module = await import("typescript");
    return module.default || module;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      "TypeScript is required for build. Install dependencies before running `npm run build`.\n" +
      `Cause: ${reason}`
    );
  }
}

function transpileTypeScript(tsOrder, tsModule) {
  for (const relTsPath of tsOrder) {
    const tsPath = path.resolve(ROOT, relTsPath);
    const jsPath = path.resolve(ROOT, relTsPath.replace("/ts/", "/js/").replace(/\.ts$/, ".js"));
    const source = fs.readFileSync(tsPath, "utf8");
    const result = tsModule.transpileModule(source, {
      compilerOptions: {
        target: tsModule.ScriptTarget.ES2019,
        module: tsModule.ModuleKind.None,
        lib: ["ES2020", "DOM"],
        strict: false,
        skipLibCheck: true
      },
      reportDiagnostics: true,
      fileName: tsPath
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      const errors = result.diagnostics
        .filter((diagnostic) => diagnostic.category === tsModule.DiagnosticCategory.Error)
        .map((diagnostic) => tsModule.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
      if (errors.length > 0) {
        throw new Error(`TypeScript transpile error in ${relTsPath}:\n${errors.join("\n")}`);
      }
    }

    fs.mkdirSync(path.dirname(jsPath), { recursive: true });
    fs.writeFileSync(jsPath, result.outputText, "utf8");
  }
}
