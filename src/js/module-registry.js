/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    var _a;
    function createModuleRegistry() {
        const modules = new Map();
        return {
            registerModule(name, moduleApi) {
                modules.set(name, moduleApi);
            },
            getModule(name) {
                var _a;
                return ((_a = modules.get(name)) !== null && _a !== void 0 ? _a : null);
            }
        };
    }
    const globalObject = globalThis;
    (_a = globalObject.__docx2mdModuleRegistry) !== null && _a !== void 0 ? _a : (globalObject.__docx2mdModuleRegistry = createModuleRegistry());
    globalObject.getDocx2mdModuleRegistry = function getDocx2mdModuleRegistry() {
        return globalObject.__docx2mdModuleRegistry;
    };
})();
