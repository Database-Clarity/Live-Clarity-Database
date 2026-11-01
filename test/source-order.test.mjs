import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertSourceOrder } from '../scripts/source-order.mjs'
const a = 'a'.repeat(40), b = 'b'.repeat(40)
const state = { schemaVersion: 1, components: { 100: { topology: {}, english: b, translations: a } }, pending: [], translationFingerprint: null, outputDigests: {} }
test('component watermarks refuse older or divergent source histories', async () => {
  const ancestor = async (x, y) => x === a && y === b
  await assertSourceOrder(state, b, ['100'], ['translations'], ancestor)
  await assert.rejects(assertSourceOrder(state, a, ['100'], ['english'], ancestor), /Stale or divergent/)
})
