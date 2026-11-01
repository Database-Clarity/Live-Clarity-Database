import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonical, preflight } from '../scripts/publish-preflight.mjs'

const publisher = 'a'.repeat(64)
const input = { perks: { 300: { editor: { en: { main: 'English' }, de: { main: 'Deutsch' } }, updateTracker: { descriptions: { de: 1 } } } }, databaseSettings: {} }
const manifest = { version: 'v1', inventoryPath: '/inventory-v1.json' }
const run = (i = input, m = manifest, p = publisher, state = null) => preflight({ input: i, manifest: m, publisher: p, state })
test('canonicalization ignores key order and source provenance, but not render inputs', () => {
  assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 }))
  const f = run().fingerprint
  assert.equal(run({ ...input, requestId: 'unrelated' }).fingerprint, f)
  assert.equal(run(input, manifest, publisher, { schemaVersion: 1, translationFingerprint: f }).result, 'unchanged')
  for (const changed of [
    { ...input, perks: { ...input.perks, 1: { editor: { en: { main: 'global' } } } } },
    { ...input, perks: { 300: { ...input.perks[300], editor: { en: { main: 'changed' } } } } },
    { ...input, databaseSettings: { changed: true } }
  ]) assert.notEqual(run(changed).fingerprint, f)
  assert.notEqual(run(input, { ...manifest, version: 'v2' }).fingerprint, f)
  assert.notEqual(run(input, manifest, 'b'.repeat(64)).fingerprint, f)
})
test('invalid identity and corrupt state fail closed', () => {
  assert.throws(() => run(input, {}), /manifest/)
  assert.throws(() => run(input, manifest, publisher, {}), /state/)
  assert.equal(run().result, 'work')
})
