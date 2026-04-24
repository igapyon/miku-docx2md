/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const xmlUtils = moduleRegistry.getModule("xmlUtils");
    const relsParser = moduleRegistry.getModule("relsParser");
    const stylesParser = moduleRegistry.getModule("stylesParser");
    const numberingParser = moduleRegistry.getModule("numberingParser");
    const documentBlockParser = moduleRegistry.getModule("documentBlockParser");
    const documentSummary = moduleRegistry.getModule("documentSummary");
    function requireDocumentSummary() {
        if (!documentSummary) {
            throw new Error("DOCX document summary module is not loaded.");
        }
        return documentSummary;
    }
    function parseDocumentXml(documentXmlBytes, relationshipsBytes, stylesBytes, numberingBytes) {
        const document = xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.parseXml(documentXmlBytes);
        const body = document ? (xmlUtils === null || xmlUtils === void 0 ? void 0 : xmlUtils.findDescendantsByLocalName(document, "body")[0]) || null : null;
        const relationships = relationshipsBytes ? (relsParser === null || relsParser === void 0 ? void 0 : relsParser.parseRelationships(relationshipsBytes, "word/document.xml")) || new Map() : new Map();
        const styles = (stylesParser === null || stylesParser === void 0 ? void 0 : stylesParser.parseStyles(stylesBytes)) || new Map();
        const numbering = (numberingParser === null || numberingParser === void 0 ? void 0 : numberingParser.parseNumbering(numberingBytes)) || { abstractNums: new Map(), nums: new Map() };
        return (documentBlockParser === null || documentBlockParser === void 0 ? void 0 : documentBlockParser.parseDocumentBody(body, relationships, styles, numbering))
            || requireDocumentSummary().createEmptyParsedDocument();
    }
    moduleRegistry.registerModule("documentParser", {
        parseDocumentXml
    });
})();
