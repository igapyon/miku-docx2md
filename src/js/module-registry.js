/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  function createModuleRegistry() {
    const modules = new Map();
    return {
      registerModule(name, moduleApi) {
        modules.set(name, moduleApi);
      },
      getModule(name) {
        return modules.get(name) ?? null;
      }
    };
  }

  globalThis.__docx2mdModuleRegistry ??= createModuleRegistry();

  globalThis.getDocx2mdModuleRegistry = function getDocx2mdModuleRegistry() {
    return globalThis.__docx2mdModuleRegistry;
  };
})();
