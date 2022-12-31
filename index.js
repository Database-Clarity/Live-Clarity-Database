"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConverter = void 0;
const fs_1 = require("fs");
const lodash_1 = __importDefault(require("lodash"));
const description_converter_1 = require("@icemourne/description-converter");
const tool_box_1 = require("@icemourne/tool-box");
const externalData_1 = require("./externalData");
const databaseConverter = (converterType) => {
    const settings = (0, description_converter_1.getSettings)(converterType);
    const newDatabase = lodash_1.default.transform(externalData_1.database, (acc, perk, hash) => {
        // first 50 are reserved for internal use only
        if (Number(hash) < 50)
            return;
        const editorDescription = perk.editor.en?.main.trim();
        // remove perks with out description
        if (editorDescription === '')
            return;
        // remove optional perks
        if (!settings.optional && perk.optional)
            return;
        // remove perks with bungie description
        if (!settings.optional && editorDescription === externalData_1.inventoryItems[hash]?.displayProperties?.description)
            return;
        const cleanPerk = (0, description_converter_1.getDataFromPerk)(perk, settings.getFromPerk);
        const descriptions = Object.entries(cleanPerk.editor).reduce((acc, [language, descriptions]) => {
            const descriptionData = {
                database: externalData_1.database,
                descriptionString: descriptions[settings.editor],
                editorType: settings.editor,
                hash: cleanPerk.hash,
                language: language
            };
            const convertedDescription = (0, description_converter_1.descriptionConverter)(descriptionData);
            if (convertedDescription) {
                acc[language] = (0, description_converter_1.descriptionFilter)(convertedDescription, converterType);
            }
            return acc;
        }, {});
        acc[hash] = {
            ...lodash_1.default.omit(cleanPerk, 'editor'),
            descriptions
        };
    });
    return (0, tool_box_1.cleanObject)(newDatabase);
};
exports.databaseConverter = databaseConverter;
if (!(0, fs_1.existsSync)('./descriptions')) {
    (0, fs_1.mkdirSync)('./descriptions');
}
for (const key in description_converter_1.converterSettings) {
    (0, fs_1.writeFileSync)(`./descriptions/${key}.json`, JSON.stringify((0, exports.databaseConverter)(key), undefined, 1));
}
console.log('Completed');
