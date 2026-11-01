// Experimental loopback-only publisher for initialized fixtures. It refuses
// real hosts and fails closed on unverifiable state or non-ancestral sources.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolveAccepted } from './resolve-inputs.mjs'
import { gitDataAdapter } from './git-data-adapter.mjs'
import { readPublishedTree } from './read-published-tree.mjs'
import { publishAtomic } from './publish-output.mjs'
import { structuralQueue, topology, dependencies } from './structural-queue.mjs'
import { composeEnglish } from './compose-english.mjs'
import { validateInitialized } from './state-v2.mjs'
import { digest, publisherIdentity, translationFingerprint, canonical } from './publish-preflight.mjs'

const [endpoint, configPath, mode] = process.argv.slice(2)
if (!endpoint || !configPath || !['english', 'translations'].includes(mode)) throw new Error('Usage: node scripts/publish-fake-http.mjs http://127.0.0.1:PORT CONFIG.json english|translations')
const base = new URL(endpoint)
if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || !base.port || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Only explicit loopback fake HTTP is allowed')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const call = async (method, path, body) => {
  let response
  try { response = await fetch(new URL(path, base), { method, redirect: 'error', headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }) }
  catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous update'), { code: 'ambiguous', cause: error }); throw error }
  if (!response.ok) throw Object.assign(new Error(`fake HTTP ${response.status}`), { code: response.status })
  try { return await response.json() } catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous response'), { code: 'ambiguous', cause: error }); throw error }
}
const adapter = gitDataAdapter(call, 'heads/output', readPublishedTree)
const publisher = publisherIdentity(process.cwd())
const inventoryBytes = readFileSync(config.inventoryPath)
const inventory = JSON.parse(inventoryBytes.toString('utf8'))
const manifest = { version: config.manifestVersion, inventoryPath: config.manifestPath }
const serializer = ['stat', 'multiplier', 'weaponTypes', 'classNames']
const output = await publishAtomic(adapter, async current => {
  validateInitialized(current.state, current.files)
  const accepted = await resolveAccepted(call, 'accepted')
  // Compare API establishes ancestry in the accepted branch, not output refs.
  for (const prior of new Set(Object.values(current.state.components).flatMap(x => [x.english, x.translations]).filter(Boolean))) {
    if (prior === accepted.commit) continue
    const compared = await call('GET', `/compare/${prior}...${accepted.commit}`)
    if (!['ahead', 'identical'].includes(compared.status)) throw new Error('Stale or divergent accepted source')
  }
  const fingerprint = translationFingerprint(accepted.input, manifest, publisher)
  if (mode === 'translations' && current.state.translationFingerprint === fingerprint && !current.state.pending.length && current.state.manifest.digest === digest(inventoryBytes)) return null
  // Imports occur only after the cheap state/fingerprint guard.
  const { convertPresets } = await import('../index.js')
  const { customJsonStringify } = await import('@icemourne/tool-box')
  const { validateOutputReferences } = await import('@icemourne/description-converter')
  const converted = convertPresets(accepted.input.perks, inventory, accepted.input.databaseSettings, mode)
  const state = structuredClone(current.state)
  const snapshots = { [state.accepted.blob]: { ...state.source, commit: state.accepted.commit }, ...(state.sourceSnapshots ?? {}) }
  const published = Object.fromEntries(Object.entries(state.components).map(([id, c]) => [id, snapshots[c.sourceBlob]?.value?.perks?.[id]]))
  if (Object.values(published).some(x => !x)) throw new Error('Missing component source')
  const queue = structuralQueue(published, accepted.input.perks, accepted.commit).map(q => ({ ...q, sourceBlob: accepted.blob }))
  const blocked = new Set(queue.flatMap(q => q.members))
  const nextFiles = {}
  for (const [path, text] of Object.entries(current.files)) {
    if (!path.startsWith('descriptions/')) continue
    const name = path.slice('descriptions/'.length, -'.json'.length)
    const old = JSON.parse(text), next = converted[name]
    if (!next) throw new Error(`Missing preset ${name}`)
    let merged
    if (mode === 'english') merged = composeEnglish(old, next, queue)
    else {
      merged = structuredClone(old)
      for (const id of new Set([...Object.keys(old), ...Object.keys(next)])) {
        if (blocked.has(id)) { if (next[id] === undefined) delete merged[id]; else merged[id] = structuredClone(next[id]); continue }
        const prior = old[id], fresh = next[id]
        if (!prior || !fresh || prior.aliasOf != null || fresh.aliasOf != null) continue
        const row = structuredClone(prior), d = { ...fresh.descriptions }
        if (Object.hasOwn(prior.descriptions ?? {}, 'en')) d.en = prior.descriptions.en; else delete d.en
        row.descriptions = d
        if (prior.updateTracker?.descriptions || fresh.updateTracker?.descriptions) {
          const tracker = { ...fresh.updateTracker?.descriptions }
          if (Object.hasOwn(prior.updateTracker?.descriptions ?? {}, 'en')) tracker.en = prior.updateTracker.descriptions.en; else delete tracker.en
          row.updateTracker = { ...prior.updateTracker, descriptions: tracker }
        }
        merged[id] = row
      }
    }
    validateOutputReferences(merged)
    nextFiles[path] = customJsonStringify(merged, serializer)
  }
  snapshots[accepted.blob] = { value: accepted.input, bytes: accepted.bytes.toString('base64'), digest: digest(canonical(accepted.input)), commit: accepted.commit }
  const ids = new Set([...Object.keys(state.components), ...Object.keys(accepted.input.perks)])
  for (const id of ids) {
    if (mode === 'english' && blocked.has(id)) continue
    const row = accepted.input.perks[id]
    if (!row) { if (mode === 'translations') { delete state.components[id]; delete state.graph[id] } continue }
    const old = state.components[id]
    const graph = topology(row), deps = [...new Set(dependencies(row))].sort()
    state.graph[id] = graph
    state.components[id] = { topology: graph, dependencies: deps, sourceCommit: accepted.commit, sourceBlob: accepted.blob, english: mode === 'english' || blocked.has(id) ? accepted.commit : old?.english ?? null, translations: mode === 'translations' ? accepted.commit : old?.translations ?? null }
  }
  state.sourceSnapshots = snapshots
  state.accepted = { commit: accepted.commit, blob: accepted.blob }
  state.source = { value: accepted.input, bytes: accepted.bytes.toString('base64'), digest: digest(canonical(accepted.input)) }
  state.pending = mode === 'english' ? queue : []
  if (mode === 'translations') state.translationFingerprint = fingerprint
  const changed = Object.entries(nextFiles).some(([path, bytes]) => bytes !== current.files[path])
  const versions = { ...current.versions, descriptions: changed ? Math.round(current.versions.descriptions * 10000 + 1) / 10000 : current.versions.descriptions }
  nextFiles['versions.json'] = JSON.stringify(versions, null, 1)
  state.outputDigests = Object.fromEntries(Object.entries(nextFiles).map(([path, value]) => [path, digest(value)]))
  state.publisher = { ...state.publisher, identity: publisher, lock: digest(readFileSync('package-lock.json')), runtime: process.version }
  state.manifest = { version: manifest.version, path: manifest.inventoryPath, digest: digest(inventoryBytes) }
  validateInitialized(state, nextFiles)
  nextFiles['.publication-state.json'] = JSON.stringify(state, null, 1)
  if ((await resolveAccepted(call, 'accepted')).commit !== accepted.commit) throw new Error('Accepted source changed; retry')
  return { files: nextFiles, message: `Publish ${mode} (fake only)` }
})
console.log(JSON.stringify(output))
