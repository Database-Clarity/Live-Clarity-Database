import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runPipeline } from '../scripts/publish-pipeline.mjs'
import { preflight } from '../scripts/publish-preflight.mjs'
import { bootstrapState } from '../scripts/publication-state.mjs'
const input = { perks: {} }, manifest = { version: '1', inventoryPath: '/a' }, publisher = 'a'.repeat(64)
const fingerprint = preflight({ input, manifest, publisher, state: null }).fingerprint
const make = () => {
  const calls = []
  const files = { 'descriptions/clarity.json': '{}' }
  const options = { mode: 'translations', publisher, resolveAccepted: async () => ({ input, commit: 'b'.repeat(40) }), resolveManifest: async () => manifest, readOutput: async () => ({ state: { ...bootstrapState(files), translationFingerprint: fingerprint }, files }), fetchInventory: async () => { calls.push('fetch'); return {} }, installAndBuild: async () => calls.push('install'), convert: async ({ languages }) => { calls.push(['convert', languages]); return {} }, publish: async () => { calls.push('publish'); return { result: 'published' } } }
  return { calls, options }
}
test('unchanged translation exits before fetch, install, conversion or publication', async () => {
  const { calls, options } = make(); assert.equal((await runPipeline(options)).result, 'unchanged'); assert.deepEqual(calls, [])
})
test('English pipeline sends only en to converter and never takes translation skip', async () => {
  const { calls, options } = make(); options.mode = 'english'; await runPipeline(options)
  assert.deepEqual(calls, ['fetch', 'install', ['convert', ['en']], 'publish'])
})
test('pending queue forces work despite matching fingerprint', async () => {
  const { calls, options } = make(); const files = { 'descriptions/clarity.json': '{}' }; options.readOutput = async () => ({ state: { ...bootstrapState(files), translationFingerprint: fingerprint, pending: [{ generation: 'c'.repeat(64), sourceCommit: 'b'.repeat(40), members: ['100'] }] }, files })
  await runPipeline(options); assert.equal(calls.at(-1), 'publish')
})
