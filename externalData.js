"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryItems = exports.database = void 0;
const fs_1 = require("fs");
const tool_box_1 = require("@icemourne/tool-box");
exports.database = JSON.parse((0, fs_1.readFileSync)('./intermediateDatabase.json', 'utf8'));
const { inventoryItems } = await (0, tool_box_1.fetchBungieManifest)(['inventoryItems']);
exports.inventoryItems = inventoryItems;
if (inventoryItems === undefined)
    throw new Error('inventoryItems is undefined');
