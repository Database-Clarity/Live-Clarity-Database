import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { digest } from '../scripts/publish-preflight.mjs'
import { planInitialization, previewInitialization } from '../scripts/initialize-offline.mjs'
import { inspectState, requiredFormats } from '../scripts/state-v2.mjs'
import { structuralQueue } from '../scripts/structural-queue.mjs'
const a = 'a'.repeat(40), b = 'b'.repeat(40), h = 'c'.repeat(64)
const input = { perks: { 1: {}, 2: {}, 3: {}, 100: { editor: { en: { main: 'text' } } } } }
const converted = Object.fromEntries(requiredFormats.map(x => [`descriptions/${x}.json`, '{}']))
const args = () => {
  const bytes = Buffer.from(JSON.stringify(input)), blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), manifestBytes = Buffer.from('{}')
  return { accepted: { commit: a, blob, input, bytes }, output: { commit: b, tree: a, versions: { descriptions: 2.0625 }, files: { 'descriptions/clarity.json': '{}' }, state: null }, publisher: { identity: h, lock: h, converter: a, runtime: 'node20', toolbox: '1.0.43' }, manifest: { version: '1', path: '/inventory', digest: digest(manifestBytes), bytes: manifestBytes }, languages: ['en', 'de'], converted: { ...converted }, fingerprint: h, validateOutput: () => {} }
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
  outputs['versions.json'] = '{}'
  assert.equal(inspectState(plan.state, outputs, options.accepted, b).status, 'recovery-required')
  assert.equal(inspectState('{broken', {}, options.accepted, b).status, 'recovery-required')
})
test('initializer requires all outputs and rejects existing state or dangling dependencies', () => {
  let options = args(); delete options.converted['descriptions/dim.json']
  assert.throws(() => planInitialization(options), /Missing output/)
  options = args(); options.output.state = {}; assert.throws(() => planInitialization(options), /missing state/)
  options = args(); options.accepted.input = { perks: { 100: { aliasOf: 999 } } }; options.accepted.bytes = Buffer.from(JSON.stringify(options.accepted.input)); options.accepted.blob = createHash('sha1').update(`blob ${options.accepted.bytes.length}\0`).update(options.accepted.bytes).digest('hex'); assert.throws(() => planInitialization(options), /Missing dependency/)
})
test('translation-only import retarget queues the old and new graph closure', () => {
  const old = { 1: {}, 2: {}, 3: {}, 100: {}, 200: {}, 300: { editor: { de: { secondary: 'export x (\nimport main from 100\n)' } } } }
  const next = { ...old, 300: { editor: { de: { secondary: 'export x (\nimport main from 200\n)' } } } }
  assert.deepEqual(structuralQueue(old, next, a)[0].members, ['100', '200', '300'])
})
