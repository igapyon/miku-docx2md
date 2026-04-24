/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const textDecoder = new TextDecoder("utf-8");

  function decodeXmlText(bytes: Uint8Array): string {
    return textDecoder.decode(bytes);
  }

  function parseXml(bytes: Uint8Array): Document {
    const xmlText = decodeXmlText(bytes);
    return new DOMParser().parseFromString(xmlText, "application/xml");
  }

  function getChildrenByLocalName(parent: ParentNode, localName: string): Element[] {
    const results: Element[] = [];
    const childNodes = parent.childNodes || [];
    for (let index = 0; index < childNodes.length; index += 1) {
      const child = childNodes[index];
      if (child.nodeType === 1 && (child as Element).localName === localName) {
        results.push(child as Element);
      }
    }
    return results;
  }

  function findDescendantsByLocalName(parent: ParentNode, localName: string): Element[] {
    const results: Element[] = [];
    const stack: ParentNode[] = [parent];
    while (stack.length > 0) {
      const current = stack.pop() as ParentNode;
      const childNodes = current.childNodes || [];
      for (let index = 0; index < childNodes.length; index += 1) {
        const child = childNodes[index];
        if (child.nodeType === 1) {
          const element = child as Element;
          if (element.localName === localName) {
            results.push(element);
          }
          stack.push(element);
        }
      }
    }
    return results;
  }

  function getTextContent(node: Node | null | undefined): string {
    return String(node?.textContent || "");
  }

  moduleRegistry.registerModule("xmlUtils", {
    decodeXmlText,
    parseXml,
    getChildrenByLocalName,
    findDescendantsByLocalName,
    getTextContent
  });
})();
