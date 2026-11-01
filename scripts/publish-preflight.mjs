// Built-in-only preflight. The caller must supply immutable accepted and manifest
// files; successful fingerprints are persisted only by the atomic publisher.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const canonical = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
}
export const digest = value => createHash('sha256').update(value).digest('hex')

// Retain converter inputs, topology, metadata and trackers. Upload controls and
// unrelated request/administrative fields are not read by this publisher.
const renderFields = ['hash', 'aliasOf', 'aliasKind', 'name', 'type', 'itemHash', 'itemName', 'editor', 'associated', 'stats', 'lastUpload', 'uploadedBy', 'updateTracker', 'metadata', 'facts', 'custom', 'legacy']
export function renderProjection(input) {
  if (!input || typeof input.perks !== 'object' || !input.perks || Array.isArray(input.perks)) throw new Error('Invalid accepted perks')
  const perks = Object.fromEntries(Object.entries(input.perks).map(([id, row]) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid accepted perk')
    return [id, Object.fromEntries(renderFields.filter(field => Object.hasOwn(row, field)).map(field => [field, row[field]]))]
  }))
  return { perks, databaseSettings: input.databaseSettings ?? null }
}
export function publisherIdentity(root) {
  const files = ['index.ts', 'externalData.ts', 'package.json', 'package-lock.json']
  const walk = dir => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const name = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(name)
      else if (entry.isFile()) files.push(name)
    }
  }
  walk('scripts')
  return digest(canonical({ runtime: process.versions.node, contract: 1, files: files.sort().map(name => [name, digest(readFileSync(join(root, name)))]) }))
}
export function translationFingerprint(input, manifest, publisher) {
  if (!manifest || typeof manifest.version !== 'string' || !manifest.version || typeof manifest.inventoryPath !== 'string' || !manifest.inventoryPath.startsWith('/')) throw new Error('Invalid manifest identity')
  if (typeof publisher !== 'string' || !/^[a-f0-9]{64}$/.test(publisher)) throw new Error('Invalid publisher identity')
  return digest(canonical({ contract: 1, mode: 'translations', input: renderProjection(input), manifest, publisher }))
}
export function preflight({ input, manifest, publisher, state }) {
  const fingerprint = translationFingerprint(input, manifest, publisher)
  if (state != null && (![1, 2].includes(state.schemaVersion) || !Object.hasOwn(state, 'translationFingerprint') || (state.translationFingerprint !== null && !/^[a-f0-9]{64}$/.test(state.translationFingerprint)))) throw new Error('Invalid publication state')
  return { fingerprint, result: state?.translationFingerprint === fingerprint ? 'unchanged' : 'work' }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [acceptedPath, manifestPath, statePath] = process.argv.slice(2)
  if (!acceptedPath || !manifestPath || !statePath) throw new Error('Usage: node publish-preflight.mjs ACCEPTED MANIFEST STATE')
  const read = path => JSON.parse(readFileSync(path, 'utf8'))
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  console.log(JSON.stringify(preflight({ input: read(acceptedPath), manifest: read(manifestPath), state: read(statePath), publisher: publisherIdentity(root) })))
}
