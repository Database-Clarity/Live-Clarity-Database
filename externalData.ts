import { readFileSync } from 'fs'

import { Database } from '@icemourne/description-converter'
import { fetchBungieManifest } from '@icemourne/tool-box'

const data: { perks: Database['perks']; databaseSettings?: Database['databaseSettings'] } = JSON.parse(readFileSync('./liveDescriptions.json', 'utf8'))
export const database = data.perks
export const databaseSettings = data.databaseSettings
const { inventoryItem } = await fetchBungieManifest(['inventoryItem'])
export { inventoryItem }
