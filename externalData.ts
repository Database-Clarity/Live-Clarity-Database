import { readFileSync } from 'fs'
import { fetchBungieManifest } from '@icemourne/tool-box'
import { InventoryItems } from '@icemourne/tool-box/bungieInterfaces/manifest'
import { Database } from '@icemourne/description-converter'

export const database = JSON.parse(readFileSync('./intermediateDatabase.json', 'utf8')) as Database
const { inventoryItems } = await fetchBungieManifest(['inventoryItems']) as { inventoryItems: InventoryItems }

if (inventoryItems === undefined) throw new Error('inventoryItems is undefined')
export { inventoryItems }