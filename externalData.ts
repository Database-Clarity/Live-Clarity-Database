import { readFileSync } from 'fs'

import { Database } from '@icemourne/description-converter'
import { fetchBungieManifest } from '@icemourne/tool-box'

const data: { perks: Database['perks'] } = JSON.parse(
   readFileSync('./liveDescriptions.json', 'utf8')
)
export const database = data.perks
debugger
const { inventoryItem } = await fetchBungieManifest(['inventoryItem'])
export { inventoryItem }
