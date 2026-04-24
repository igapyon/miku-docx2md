/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  type ModuleRegistry = {
    registerModule: (name: string, moduleApi: unknown) => void;
    getModule: <T>(name: string) => T | null;
  };

  function createModuleRegistry(): ModuleRegistry {
    const modules = new Map<string, unknown>();
    return {
      registerModule(name, moduleApi) {
        modules.set(name, moduleApi);
      },
      getModule(name) {
        return (modules.get(name) ?? null) as never;
      }
    };
  }

  const globalObject = globalThis as typeof globalThis & {
    __docx2mdModuleRegistry?: ModuleRegistry;
    getDocx2mdModuleRegistry?: () => ModuleRegistry;
  };

  globalObject.__docx2mdModuleRegistry ??= createModuleRegistry();

  globalObject.getDocx2mdModuleRegistry = function getDocx2mdModuleRegistry(): ModuleRegistry {
    return globalObject.__docx2mdModuleRegistry as ModuleRegistry;
  };
})();
