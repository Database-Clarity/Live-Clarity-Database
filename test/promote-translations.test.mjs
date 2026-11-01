import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promoteTranslations } from '../scripts/promote-translations.mjs'
const a = 'a'.repeat(40), b = 'b'.repeat(40), g = 'c'.repeat(64), f = 'd'.repeat(64)
const state = () => ({ schemaVersion: 1, translationFingerprint: null, outputDigests: {}, components: { 100: { topology: {}, english: a, translations: a }, 200: { topology: {}, english: a, translations: a } }, pending: [{ generation: g, sourceCommit: a, members: ['100'] }] })
const old = { clarity: { 100: { descriptions: { en: 'old', de: 'alt' } }, 200: { descriptions: { en: 'newer', de: 'alt' } } } }
const converted = { clarity: { 100: { descriptions: { en: 'structure', de: 'struktur' } }, 200: { descriptions: { en: 'stale', de: 'neu' } } } }
test('matching structural generation promotes all languages while content-only preserves English', () => {
  const result = promoteTranslations({ currentState: state(), snapshotState: state(), currentOutputs: old, convertedOutputs: converted, sourceCommit: a, fingerprint: f, acceptedSource: { 100: {} } })
  assert.deepEqual(result.outputs.clarity[100], converted.clarity[100])
  assert.deepEqual(result.outputs.clarity[200].descriptions, { en: 'newer', de: 'neu' })
  assert.equal(result.state.translationFingerprint, f); assert.deepEqual(result.state.pending, [])
})
test('newer component watermark defers structural output and retains queue and fingerprint', () => {
  const current = state(); current.components[100].english = b
  const result = promoteTranslations({ currentState: current, snapshotState: state(), currentOutputs: old, convertedOutputs: converted, sourceCommit: a, fingerprint: f, acceptedSource: { 100: {} } })
  assert.deepEqual(result.outputs.clarity[100], old.clarity[100]); assert.equal(result.state.translationFingerprint, null)
  assert.deepEqual(result.deferred, [g]); assert.equal(result.state.pending.length, 1)
})

test('newer successful translation blocks an older conversion', () => {
  const current = state(); current.components[200].translations = b
  assert.throws(() => promoteTranslations({ currentState: current, snapshotState: state(), currentOutputs: old, convertedOutputs: converted, sourceCommit: a, fingerprint: f, acceptedSource: { 100: {} } }), /Translation watermark changed/)
})
