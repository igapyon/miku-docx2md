/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const textDecoder = new TextDecoder("utf-8");
    function decodeXmlText(bytes) {
        return textDecoder.decode(bytes);
    }
    function parseXml(bytes) {
        const xmlText = decodeXmlText(bytes);
        return new DOMParser().parseFromString(xmlText, "application/xml");
    }
    function getChildrenByLocalName(parent, localName) {
        const results = [];
        const childNodes = parent.childNodes || [];
        for (let index = 0; index < childNodes.length; index += 1) {
            const child = childNodes[index];
            if (child.nodeType === 1 && child.localName === localName) {
                results.push(child);
            }
        }
        return results;
    }
    function findDescendantsByLocalName(parent, localName) {
        const results = [];
        const stack = [parent];
        while (stack.length > 0) {
            const current = stack.pop();
            const childNodes = current.childNodes || [];
            for (let index = 0; index < childNodes.length; index += 1) {
                const child = childNodes[index];
                if (child.nodeType === 1) {
                    const element = child;
                    if (element.localName === localName) {
                        results.push(element);
                    }
                    stack.push(element);
                }
            }
        }
        return results;
    }
    function getTextContent(node) {
        return String((node === null || node === void 0 ? void 0 : node.textContent) || "");
    }
    function getAttributeValue(element, name, fallback = "") {
        return (element === null || element === void 0 ? void 0 : element.getAttribute(name)) || fallback;
    }
    function getWordAttributeValue(element, localName, fallback = "") {
        return (element === null || element === void 0 ? void 0 : element.getAttribute(`w:${localName}`)) || (element === null || element === void 0 ? void 0 : element.getAttribute(localName)) || fallback;
    }
    function getNamespacedAttributeValue(element, namespacePrefix, localName, fallback = "") {
        return (element === null || element === void 0 ? void 0 : element.getAttribute(`${namespacePrefix}:${localName}`)) || (element === null || element === void 0 ? void 0 : element.getAttribute(localName)) || fallback;
    }
    moduleRegistry.registerModule("xmlUtils", {
        decodeXmlText,
        parseXml,
        getChildrenByLocalName,
        findDescendantsByLocalName,
        getTextContent,
        getAttributeValue,
        getWordAttributeValue,
        getNamespacedAttributeValue
    });
})();
