import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { digest, canonical } from '../scripts/publish-preflight.mjs'
import { runPipeline } from '../scripts/publish-pipeline.mjs'
import { preflight } from '../scripts/publish-preflight.mjs'
import { planInitialization } from '../scripts/initialize-offline.mjs'
import { requiredFormats } from '../scripts/state-v2.mjs'
import { sourceKey } from '../scripts/state-v2.mjs'
import { structuralQueue } from '../scripts/structural-queue.mjs'
const input = { perks: {} }, manifest = { version: '1', inventoryPath: '/a' }, publisher = 'a'.repeat(64), commit = 'b'.repeat(40)
const fingerprint = preflight({ input, manifest, publisher, state: null }).fingerprint
const make = () => {
  const calls = [], converted = Object.fromEntries(requiredFormats.map(x => [`descriptions/${x}.json`, '{}']))
  const bytes = Buffer.from(JSON.stringify(input)), blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), manifestBytes = Buffer.from('{}')
  const legacy = Object.fromEntries(requiredFormats.filter(name => name !== 'clarityV2').map(name => [`descriptions/${name}.json`, '{}']))
  const plan = planInitialization({ accepted: { commit, blob, input, bytes }, output: { commit, tree: commit, versions: { descriptions: 1 }, versionBytes: '{"descriptions":1}', files: legacy, state: null }, publisher: { identity: publisher, lock: publisher, converter: commit, runtime: 'node20', toolbox: '1.0.43' }, manifest: { version: '1', path: '/a', digest: digest(manifestBytes), bytes: manifestBytes }, languages: ['en'], converted, fingerprint, validateOutput: () => {} })
  const files = Object.fromEntries(Object.entries(plan.files).filter(([p]) => p !== '.publication-state.json'))
  const options = { mode: 'translations', publisher, resolveAccepted: async () => ({ input, commit }), resolveManifest: async () => manifest, readOutput: async () => ({ state: plan.state, files }), fetchInventory: async () => { calls.push('fetch'); return {} }, installAndBuild: async () => calls.push('install'), convert: async ({ languages }) => { calls.push(['convert', languages]); return {} }, publish: async () => { calls.push('publish'); return { result: 'published' } } }
  return { calls, options, plan, files }
}
test('unchanged translation exits before fetch, install, conversion or publication', async () => {
  const { calls, options } = make(); assert.equal((await runPipeline(options)).result, 'unchanged'); assert.deepEqual(calls, [])
})
test('English pipeline sends only en to converter and never takes translation skip', async () => {
  const { calls, options } = make(); options.mode = 'english'; await runPipeline(options)
  assert.deepEqual(calls, ['fetch', 'install', ['convert', ['en']], 'publish'])
})
test('pending queue forces work despite matching fingerprint', async () => {
  const { calls, options, plan, files } = make()
  const desired = { perks: { 100: { hash: 100 } } }, nextCommit = 'c'.repeat(40), bytes = Buffer.from(JSON.stringify(desired))
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), repository = plan.state.accepted.repository
  const snapshot = { ...plan.state.source, ...plan.state.accepted }
  const sourceSnapshots = { [sourceKey(repository, commit, plan.state.accepted.blob)]: snapshot }
  const pending = structuralQueue({}, desired.perks, nextCommit).map(q => ({ ...q, sourceRepo: repository, sourceBlob: blob }))
  const state = { ...plan.state, sourceSnapshots, accepted: { repository, ref: plan.state.accepted.ref, commit: nextCommit, blob }, source: { value: desired, bytes: bytes.toString('base64'), digest: digest(canonical(desired)) }, pending, translationFingerprint: preflight({ input: desired, manifest, publisher, state: null }).fingerprint }
  options.readOutput = async () => ({ state, files }); options.resolveAccepted = async () => ({ input: desired, commit: nextCommit })
  await runPipeline(options); assert.equal(calls.at(-1), 'publish')
  options.readOutput = async () => ({ state: { ...state, pending: [] }, files })
  await assert.rejects(runPipeline(options), /recovery-required/)
})
test('normal pipeline rejects missing and malformed state before work', async () => {
  const { calls, options } = make(); options.readOutput = async () => ({ state: null }); await assert.rejects(runPipeline(options), /initialization-required/)
  options.readOutput = async () => ({ state: {}, files: {} }); await assert.rejects(runPipeline(options), /recovery-required/); assert.deepEqual(calls, [])
})
test('tampered queued generation is rejected before conversion', async () => {
  const { calls, options, plan, files } = make()
  options.readOutput = async () => ({ state: { ...plan.state, pending: [{ generation: 'c'.repeat(64), sourceRepo: plan.state.accepted.repository, sourceCommit: commit, sourceBlob: plan.state.accepted.blob, members: ['100'] }] }, files })
  await assert.rejects(runPipeline(options), /recovery-required/); assert.deepEqual(calls, [])
})
