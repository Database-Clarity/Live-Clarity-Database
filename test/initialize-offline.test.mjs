import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { digest, translationFingerprint } from '../scripts/publish-preflight.mjs'
import { planInitialization, previewInitialization } from '../scripts/initialize-offline.mjs'
import { inspectState, requiredFormats, sourceKey } from '../scripts/state-v2.mjs'
import { structuralQueue } from '../scripts/structural-queue.mjs'
const a = 'a'.repeat(40), b = 'b'.repeat(40), h = 'c'.repeat(64)
const input = { perks: { 1: {}, 2: {}, 3: {}, 100: { editor: { en: { main: 'text' } } } } }
const converted = Object.fromEntries(requiredFormats.map(x => [`descriptions/${x}.json`, '{}']))
const args = () => {
  const bytes = Buffer.from(JSON.stringify(input)), blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), manifestBytes = Buffer.from('{}')
  const files = Object.fromEntries(requiredFormats.filter(name => name !== 'clarityV2').map(name => [`descriptions/${name}.json`, '{}']))
  return { accepted: { commit: a, blob, input, bytes }, output: { commit: b, tree: a, versions: { descriptions: 2.0625 }, versionBytes: '{"descriptions":2.0625}', files, state: null }, publisher: { identity: h, lock: h, converter: a, runtime: 'node20', toolbox: '1.0.43' }, manifest: { version: '1', path: '/inventory', digest: digest(manifestBytes), bytes: manifestBytes }, languages: ['en', 'de'], converted: { ...converted }, fingerprint: h, validateOutput: () => {} }
}
test('missing state reports unknown coverage and offline initialization preserves legacy until publication', () => {
  const options = args()
  assert.equal(inspectState(null, options.output.files, options.accepted, b).status, 'initialization-required')
  const plan = planInitialization(options)
  assert.equal(previewInitialization(plan).result, 'dry-run')
  assert.equal(plan.state.accepted.commit, a); assert.equal(plan.state.components[100].english, a)
  assert.equal(options.output.files['descriptions/clarity.json'], '{}')
  const outputs = Object.fromEntries(Object.entries(plan.files).filter(([p]) => p !== '.publication-state.json'))
  assert.equal(inspectState(plan.state, outputs, options.accepted, b).status, 'initialized')
  const statusInputs = { sourceBytes: options.accepted.bytes.toString('base64'), manifest: { version: '1', inventoryPath: '/inventory' }, publisher: h }
  plan.state.translationFingerprint = translationFingerprint(options.accepted.input, statusInputs.manifest, h)
  const retained = { ...plan.state, retainedLanguages: { 100: ['de'] } }
  assert.deepEqual(inspectState(retained, outputs, options.accepted, b).retainedLanguages, { 100: ['de'] })
  const unknown = inspectState(plan.state, outputs, plan.state.accepted, b)
  assert.equal(unknown.translationFreshness, 'unknown'); assert.equal(unknown.pendingAcceptedWork, null)
  const current = inspectState(plan.state, outputs, plan.state.accepted, b, statusInputs)
  assert.equal(current.translationFreshness, 'current'); assert.equal(current.pendingAcceptedWork, false)
  const pending = inspectState(plan.state, outputs, plan.state.accepted, b, { ...statusInputs, manifest: { ...statusInputs.manifest, version: '2' } })
  assert.equal(pending.translationFreshness, 'pending'); assert.equal(pending.pendingAcceptedWork, true)
  const stale = inspectState(retained, outputs, plan.state.accepted, b, statusInputs)
  assert.equal(stale.translationFreshness, 'retained'); assert.equal(stale.pendingAcceptedWork, true)
  assert.equal(inspectState(plan.state, outputs, plan.state.accepted, b, { ...statusInputs, sourceBytes: Buffer.from('{}').toString('base64') }).status, 'input-unavailable')
  const invalidRefs = { ...outputs, 'descriptions/clarityV2.json': '{"500":{"hash":500,"aliasOf":999}}' }
  const matchingDigest = { ...plan.state, outputDigests: { ...plan.state.outputDigests, 'descriptions/clarityV2.json': digest(invalidRefs['descriptions/clarityV2.json']) } }
  assert.equal(inspectState(matchingDigest, invalidRefs, plan.state.accepted, b).status, 'recovery-required')
  assert.equal(inspectState({ ...plan.state, retainedLanguages: { 100: ['en'] } }, outputs, options.accepted, b).status, 'recovery-required')
  outputs['versions.json'] = '{}'
  assert.equal(inspectState(plan.state, outputs, options.accepted, b).status, 'recovery-required')
  assert.equal(inspectState('{broken', {}, options.accepted, b).status, 'recovery-required')
})
test('initializer requires all outputs and rejects existing state or dangling dependencies', () => {
  let options = args(); delete options.converted['descriptions/dim.json']
  assert.throws(() => planInitialization(options), /Incomplete or unexpected converted output/)
  options = args(); delete options.output.files['descriptions/braytech.json']; assert.throws(() => planInitialization(options), /Incomplete pinned legacy baseline/)
  options = args(); options.output.versionBytes = '{"descriptions":9}'; assert.throws(() => planInitialization(options), /Incomplete pinned legacy baseline/)
  options = args(); options.output.state = {}; assert.throws(() => planInitialization(options), /missing state/)
  options = args(); options.accepted.input = { perks: { 100: { aliasOf: 999 } } }; options.accepted.bytes = Buffer.from(JSON.stringify(options.accepted.input)); options.accepted.blob = createHash('sha1').update(`blob ${options.accepted.bytes.length}\0`).update(options.accepted.bytes).digest('hex'); assert.throws(() => planInitialization(options), /Missing dependency/)
})
test('translation-only import retarget queues the old and new graph closure', () => {
  const old = { 1: {}, 2: {}, 3: {}, 100: {}, 200: {}, 300: { editor: { de: { secondary: 'export x (\nimport main from 100\n)' } } } }
  const next = { ...old, 300: { editor: { de: { secondary: 'export x (\nimport main from 200\n)' } } } }
  assert.deepEqual(structuralQueue(old, next, a)[0].members, ['100', '200', '300'])
})
test('state validates mixed component source snapshots and rejects tampering', () => {
  const firstArgs = args(), first = planInitialization(firstArgs)
  const nextArgs = args()
  nextArgs.accepted.input = { perks: { ...input.perks, 100: { editor: { en: { main: 'new' } } } } }
  nextArgs.accepted.bytes = Buffer.from(JSON.stringify(nextArgs.accepted.input))
  nextArgs.accepted.blob = createHash('sha1').update(`blob ${nextArgs.accepted.bytes.length}\0`).update(nextArgs.accepted.bytes).digest('hex')
  nextArgs.accepted.commit = b
  const next = planInitialization(nextArgs), state = structuredClone(next.state)
  const key = sourceKey(first.state.accepted.repository, first.state.accepted.commit, first.state.accepted.blob)
  state.sourceSnapshots = { [key]: { ...first.state.source, ...first.state.accepted } }
  state.components[100] = first.state.components[100]; state.graph[100] = first.state.graph[100]
  const outputs = Object.fromEntries(Object.entries(next.files).filter(([p]) => p !== '.publication-state.json'))
  assert.equal(inspectState(state, outputs, nextArgs.accepted, b).status, 'initialized')
  const invalidRepo = structuredClone(state); invalidRepo.components[100].sourceRepo = 'other/repo'
  assert.equal(inspectState(invalidRepo, outputs, nextArgs.accepted, b).status, 'recovery-required')
  const invalidCommit = structuredClone(state); invalidCommit.components[100].sourceCommit = 'e'.repeat(40)
  assert.equal(inspectState(invalidCommit, outputs, nextArgs.accepted, b).status, 'recovery-required')
  const invalidWatermark = structuredClone(state); invalidWatermark.components[100].translations = 'e'.repeat(40)
  assert.equal(inspectState(invalidWatermark, outputs, nextArgs.accepted, b).status, 'recovery-required')
  state.sourceSnapshots[key].value.perks[100].editor.en.main = 'tampered'
  assert.equal(inspectState(state, outputs, nextArgs.accepted, b).status, 'recovery-required')
})
