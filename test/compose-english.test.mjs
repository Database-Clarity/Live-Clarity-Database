import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composeEnglish } from '../scripts/compose-english.mjs'
test('English composition preserves queued components and prior translated content', () => {
  const old = { 100: { descriptions: { en: 'old', de: [{ text: 'alt' }] }, updateTracker: { descriptions: { en: 1, de: 2 } } }, 200: { descriptions: { en: 'old', de: 'bleibt' } }, 300: { descriptions: { en: 'remove', de: 'kept' } } }
  const fresh = { 100: { descriptions: { en: 'new' }, updateTracker: { descriptions: { en: 3 } } }, 200: { descriptions: { en: 'queued' } } }
  const output = composeEnglish(old, fresh, [{ members: ['200'] }])
  assert.deepEqual(output[100].descriptions, { en: 'new', de: [{ text: 'alt' }] })
  assert.deepEqual(output[100].updateTracker.descriptions, { en: 3, de: 2 })
  assert.deepEqual(output[200], old[200])
  assert.deepEqual(output[300].descriptions, { de: 'kept' })
})
test('unqueued alias changes fail closed', () => {
  assert.throws(() => composeEnglish({ 100: { hash: 100, aliasOf: 200 } }, { 100: { hash: 100, aliasOf: 300 } }, []), /Unqueued/)
})
