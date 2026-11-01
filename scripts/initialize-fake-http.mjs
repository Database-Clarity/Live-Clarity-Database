// Preparation-only CLI. It refuses every non-loopback endpoint and therefore
// cannot initialize a real repository, even if given production credentials.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { convertPresets } from '../index.js'
import { validateOutputReferences } from '@icemourne/description-converter'
import { customJsonStringify } from '@icemourne/tool-box'
import { resolveAccepted } from './resolve-inputs.mjs'
import { gitDataAdapter } from './git-data-adapter.mjs'
import { planInitialization } from './initialize-offline.mjs'
import { publisherIdentity, digest, translationFingerprint } from './publish-preflight.mjs'
import { validateInitialized } from './state-v2.mjs'

const [endpoint, configPath] = process.argv.slice(2)
if (!endpoint || !configPath) throw new Error('Usage: node scripts/initialize-fake-http.mjs http://127.0.0.1:PORT CONFIG.json')
const url = new URL(endpoint)
if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Only explicit loopback fake HTTP is allowed')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const call = async (method, path, body) => {
  let response
  try { response = await fetch(new URL(path, url), { method, redirect: 'error', headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }) }
  catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous update'), { code: 'ambiguous', cause: error }); throw error }
  if (!response.ok) throw Object.assign(new Error(`fake HTTP ${response.status}`), { code: response.status })
  try { return await response.json() } catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous response'), { code: 'ambiguous', cause: error }); throw error }
}
const readOutput = async (treeSha, api) => {
  const tree = await api('GET', `/git/trees/${treeSha}?recursive=1`)
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete tree')
  const files = {}
  for (const item of tree.tree) {
    if (item.type !== 'blob' || !(/^(descriptions\/[A-Za-z0-9_-]+\.json|versions\.json|\.publication-state\.json)$/.test(item.path))) continue
    const blob = await api('GET', `/git/blobs/${item.sha}`)
    if (blob.encoding !== 'base64') throw new Error('Invalid output blob')
    const bytes = Buffer.from(blob.content, 'base64')
    if (createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== item.sha) throw new Error('Output blob mismatch')
    files[item.path] = bytes.toString('utf8')
  }
  if (!files['versions.json']) throw new Error('Missing output versions')
  const state = files['.publication-state.json'] ? JSON.parse(files['.publication-state.json']) : null
  const versions = JSON.parse(files['versions.json'])
  const descriptions = Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith('descriptions/')))
  return { state, versions, versionBytes: files['versions.json'], files: descriptions }
}
const adapter = gitDataAdapter(call, 'heads/output', readOutput)
const initial = await adapter.readHead()
const accepted = await resolveAccepted(call, 'accepted')
const inventoryBytes = readFileSync(config.inventoryPath)
const inventory = JSON.parse(inventoryBytes.toString('utf8'))
const manifest = { version: config.manifestVersion, path: config.manifestPath, digest: digest(inventoryBytes), bytes: inventoryBytes }
const identity = publisherIdentity(process.cwd())
const publisher = { identity, lock: digest(readFileSync('package-lock.json')), converter: '047673916754f2b4a9af2635612dac8876af0dd7', runtime: process.version, toolbox: '1.0.43' }
const fingerprint = translationFingerprint(accepted.input, { version: manifest.version, inventoryPath: manifest.path }, identity)
if (initial.state != null) {
  const versionBytes = initial.versionBytes
  validateInitialized(initial.state, { ...initial.files, 'versions.json': versionBytes })
  if (initial.state.accepted.commit !== accepted.commit || initial.state.accepted.blob !== accepted.blob || initial.state.translationFingerprint !== fingerprint || initial.state.manifest.digest !== manifest.digest || initial.state.publisher.identity !== identity) throw new Error('Already initialized with different inputs')
  console.log(JSON.stringify({ result: 'already-initialized-fake', commit: initial.head, source: accepted.commit, operation: initial.state.baseline.operation }))
  process.exit(0)
}
const result = convertPresets(accepted.input.perks, inventory, accepted.input.databaseSettings, 'translations')
const converted = Object.fromEntries(Object.entries(result).map(([name, rows]) => [`descriptions/${name}.json`, customJsonStringify(rows, ['stat', 'multiplier', 'weaponTypes', 'classNames'])]))
const languages = [...new Set(Object.values(accepted.input.perks).flatMap(perk => Object.keys(perk.editor ?? {})))].sort()
const plan = planInitialization({ accepted, output: { commit: initial.head, tree: initial.tree, state: initial.state, files: initial.files, versions: initial.versions }, publisher, manifest, languages, converted, fingerprint, validateOutput: (_path, bytes) => validateOutputReferences(JSON.parse(bytes)) })
// Abort before any staging if either cumulative input or output changed.
if ((await resolveAccepted(call, 'accepted')).commit !== accepted.commit || (await adapter.readHead()).head !== initial.head) throw new Error('Pins changed; replan')
const commit = await adapter.stage(initial.head, { files: plan.files, message: 'Initialize publication (fake only)' })
// This second check prevents publishing a candidate made stale while staging.
if ((await resolveAccepted(call, 'accepted')).commit !== accepted.commit || (await adapter.readHead()).head !== initial.head) throw new Error('Pins changed; replan')
try { await adapter.update(initial.head, commit) } catch (error) {
  if (error.code !== 'ambiguous') throw error
  const current = await adapter.readHead()
  if (current.head !== commit && !(await adapter.isAncestor(commit, current.head))) throw error
}
console.log(JSON.stringify({ result: 'initialized-fake', commit, source: accepted.commit, operation: plan.operation }))
