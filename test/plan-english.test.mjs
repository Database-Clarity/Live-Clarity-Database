import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planEnglish } from '../scripts/plan-english.mjs'
const a = 'a'.repeat(40), b = 'b'.repeat(40)
const old = { 100: {}, 200: { aliasOf: 100, aliasKind: 'frame' }, 300: {} }
const next = { ...old, 200: { aliasOf: 300, aliasKind: 'frame' }, 400: {} }
const state = { schemaVersion: 1, components: Object.fromEntries(Object.keys(old).map(id => [id, { topology: {}, english: a, translations: a }])), pending: [], translationFingerprint: null, outputDigests: {} }
test('structural closure stays queued and independent component watermarks advance', async () => {
  const result = await planEnglish(state, old, next, b, async (x, y) => x === a && y === b)
  assert.deepEqual(result.queue.map(x => x.members), [['100', '200', '300'], ['400']])
  assert.equal(result.state.components[100].english, a)
  assert.equal(result.state.components[300].translations, a)
  assert.equal(state.pending.length, 0)
})
