import { digest } from './publish-preflight.mjs'

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)

// State is committed together with all outputs. Null watermarks mean unknown,
// as on the initial legacy baseline; they never assert compiled success.
export function validateState(state) {
  if (!object(state) || state.schemaVersion !== 1 || !object(state.components) || !Array.isArray(state.pending) || !object(state.outputDigests) || !(state.translationFingerprint === null || hash(state.translationFingerprint))) throw new Error('Invalid publication state')
  for (const [path, value] of Object.entries(state.outputDigests)) {
    if (!/^descriptions\/[^/]+\.json$/.test(path) || !hash(value)) throw new Error('Invalid output digest')
  }
  for (const [id, component] of Object.entries(state.components)) {
    if (!/^\d+$/.test(id) || !object(component) || !Object.hasOwn(component, 'topology') || !object(component.topology) || !['english', 'translations'].every(k => component[k] === null || sha(component[k]))) throw new Error('Invalid component watermark')
  }
  const generations = new Set(), members = new Set()
  for (const entry of state.pending) {
    if (!object(entry) || !hash(entry.generation) || !sha(entry.sourceCommit) || !Array.isArray(entry.members) || !entry.members.length || entry.members.some(id => typeof id !== 'string' || !/^\d+$/.test(id)) || new Set(entry.members).size !== entry.members.length || generations.has(entry.generation)) throw new Error('Invalid pending generation')
    generations.add(entry.generation)
    for (const id of entry.members) { if (members.has(id)) throw new Error('Overlapping pending generations'); members.add(id) }
  }
  return state
}
export function bootstrapState(outputs) {
  if (!object(outputs) || !Object.keys(outputs).length) throw new Error('Missing baseline outputs')
  const outputDigests = Object.fromEntries(Object.entries(outputs).map(([path, bytes]) => [path, digest(bytes)]))
  return validateState({ schemaVersion: 1, components: {}, pending: [], translationFingerprint: null, outputDigests, provenance: 'legacy-unknown' })
}
export function verifyOutputDigests(state, outputs) {
  validateState(state)
  const keys = Object.keys(state.outputDigests).sort()
  if (!keys.length) throw new Error('Missing baseline outputs')
  if (JSON.stringify(keys) !== JSON.stringify(Object.keys(outputs).sort())) throw new Error('Output set does not match state')
  for (const path of keys) if (digest(outputs[path]) !== state.outputDigests[path]) throw new Error(`Output digest mismatch: ${path}`)
}
