import { createHash } from 'node:crypto'
import { digest } from './publish-preflight.mjs'
const sha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value)
export async function resolveAccepted(api, branch, repository = 'fixture/accepted') {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid accepted repository')
  if (typeof branch !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(branch) || branch.startsWith('/') || branch.includes('..')) throw new Error('Invalid accepted ref')
  const ref = await api('GET', `/git/ref/heads/${branch}`)
  const commit = ref?.object?.sha
  if (!sha(commit)) throw new Error('Invalid accepted commit')
  const file = await api('GET', `/contents/liveDescriptions.json?ref=${commit}`)
  if (file.encoding !== 'base64' || !sha(file.sha) || typeof file.content !== 'string') throw new Error('Invalid accepted blob')
  const bytes = Buffer.from(file.content.replace(/\s/g, ''), 'base64')
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  if (blob !== file.sha) throw new Error('Accepted blob digest mismatch')
  return { repository, ref: branch, commit, blob, bytes, input: JSON.parse(bytes.toString('utf8')) }
}
export async function resolveManifestIdentity(fetchJson) {
  const metadata = await fetchJson('https://www.bungie.net/Platform/Destiny2/Manifest/')
  const version = metadata?.Response?.version
  const inventoryPath = metadata?.Response?.jsonWorldComponentContentPaths?.en?.DestinyInventoryItemDefinition
  if (typeof version !== 'string' || !version || typeof inventoryPath !== 'string' || !inventoryPath.startsWith('/') || inventoryPath.startsWith('//')) throw new Error('Invalid Bungie manifest identity')
  return { version, inventoryPath }
}
export async function fetchPinnedInventory(fetchBytes, identity) {
  if (typeof identity?.inventoryPath !== 'string' || !identity.inventoryPath.startsWith('/') || identity.inventoryPath.startsWith('//')) throw new Error('Invalid inventory path')
  const bytes = Buffer.from(await fetchBytes(`https://www.bungie.net${identity.inventoryPath}`))
  JSON.parse(bytes.toString('utf8'))
  return { bytes, sha256: digest(bytes) }
}
