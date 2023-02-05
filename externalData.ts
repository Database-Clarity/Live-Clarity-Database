import { readFileSync } from 'fs'

import { Database } from '@icemourne/description-converter'
import { fetchBungieManifest } from '@icemourne/tool-box'

export const { perks: database }: { perks: Database['perks'] } = JSON.parse(
   readFileSync('./liveDescriptions.json', 'utf8')
)
const { inventoryItem } = await fetchBungieManifest(['inventoryItem'])
export { inventoryItem }
