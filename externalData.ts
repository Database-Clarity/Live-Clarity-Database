import { readFileSync } from 'fs'
import { fetchBungieManifest, InventoryItems } from '@icemourne/tool-box'
import { Database } from '@icemourne/description-converter'

export const database = JSON.parse(readFileSync('./intermediateDescriptions.json', 'utf8')) as Database
const { inventoryItem } = await fetchBungieManifest(['inventoryItem']) as { inventoryItem: InventoryItems }
export { inventoryItem }