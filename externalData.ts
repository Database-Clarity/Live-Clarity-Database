import { readFileSync } from 'fs'
import { createHash } from 'crypto'

import { Database } from '@icemourne/description-converter'
import { fetchBungieManifest } from '@icemourne/tool-box'

// Split runs must provide both immutable inputs and the digest resolved during
// preflight. The legacy CLI remains unchanged until an approved cut-over.
const acceptedPath = process.env.PUBLISH_ACCEPTED_PATH
const inventoryPath = process.env.PUBLISH_INVENTORY_PATH
const inventoryDigest = process.env.PUBLISH_INVENTORY_SHA256
if ([acceptedPath, inventoryPath, inventoryDigest].some(Boolean) &&
    (!acceptedPath || !inventoryPath || !inventoryDigest || !/^[a-f0-9]{64}$/.test(inventoryDigest))) {
  throw new Error('Split publishing requires accepted input, inventory and SHA256')
}
const data: { perks: Database['perks']; databaseSettings?: Database['databaseSettings'] } = JSON.parse(readFileSync(acceptedPath ?? './liveDescriptions.json', 'utf8'))
export const database = data.perks
export const databaseSettings = data.databaseSettings
let inventoryItem: { [hash: string]: { displayProperties?: { description?: string } } } | undefined
if (inventoryPath) {
  const bytes = readFileSync(inventoryPath)
  if (createHash('sha256').update(bytes).digest('hex') !== inventoryDigest) throw new Error('Inventory digest mismatch')
  inventoryItem = JSON.parse(bytes.toString('utf8'))
} else {
  ;({ inventoryItem } = await fetchBungieManifest(['inventoryItem']))
}
export { inventoryItem }
