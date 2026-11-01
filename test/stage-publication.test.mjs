import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stagePublication } from '../scripts/stage-publication.mjs'
const state = { schemaVersion: 1, components: {}, pending: [], translationFingerprint: null, outputDigests: {} }
const run = outputs => stagePublication({ previousFiles: { 'descriptions/a.json': '{}' }, outputs, state, versions: { descriptions: 2.0625 }, validate: () => {} })
test('version and state are staged with outputs, with no bump for state-only changes', () => {
  let r = run({ 'descriptions/a.json': '{}' }); assert.equal(r.outputChanged, false); assert.equal(JSON.parse(r.files['versions.json']).descriptions, 2.0625)
  r = run({ 'descriptions/a.json': '{"100":{}}' }); assert.equal(r.outputChanged, true); assert.equal(JSON.parse(r.files['versions.json']).descriptions, 2.0626)
  assert.match(JSON.parse(r.files['.publication-state.json']).outputDigests['descriptions/a.json'], /^[a-f0-9]{64}$/)
  assert.throws(() => run({ 'descriptions/b.json': '{}' }), /Missing prior output/)
})
