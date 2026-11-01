import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previewBaselineImport } from '../scripts/import-baseline-offline.mjs'
test('equal bytes without authenticated graph and execution evidence cannot import a baseline', async () => {
  await assert.rejects(previewBaselineImport({ candidate: { baseline: { kind: 'verified-import' } }, outputs: {}, evidence: {}, verifyProvenance: async () => true }), /Incomplete baseline provenance/)
  await assert.rejects(previewBaselineImport({ candidate: {}, outputs: {}, evidence: {} }), /independent verifier/)
})
