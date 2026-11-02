import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import { previewBaselineImport } from '../scripts/import-baseline-offline.mjs'
import { planInitialization } from '../scripts/initialize-offline.mjs'
import { canonical, digest } from '../scripts/publish-preflight.mjs'
import { requiredFormats } from '../scripts/state-v2.mjs'
test('equal bytes without authenticated graph and execution evidence cannot import a baseline', async () => {
  await assert.rejects(previewBaselineImport({ candidate: { baseline: { kind: 'verified-import' } }, outputs: {}, evidence: {}, trustedPublicKey: 'invalid' }), /Incomplete baseline provenance/)
  await assert.rejects(previewBaselineImport({ candidate: {}, outputs: {}, evidence: {} }), /independent verifier/)
})
test('offline attestation binds seven unchanged legacy outputs and full graph', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519'), sha = 'a'.repeat(40), hash = 'b'.repeat(64)
  const input = { perks: { 1: {}, 2: {}, 3: {} } }, bytes = Buffer.from(JSON.stringify(input)), blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  const legacy = Object.fromEntries(requiredFormats.filter(x => x !== 'clarityV2').map(x => [`descriptions/${x}.json`, '{}']))
  const converted = Object.fromEntries(requiredFormats.map(x => [`descriptions/${x}.json`, '{}'])), manifest = Buffer.from('{}')
  const init = planInitialization({ accepted: { commit: sha, blob, bytes, input }, output: { commit: sha, tree: sha, files: legacy, versions: { descriptions: 1 }, versionBytes: '{"descriptions":1}', state: null }, publisher: { identity: hash, lock: hash, converter: sha, runtime: 'node20', toolbox: '1.0.43' }, manifest: { version: 'v1', path: '/v1', digest: digest(manifest), bytes: manifest }, languages: ['en'], converted, fingerprint: hash, validateOutput: () => {} })
  const candidate = structuredClone(init.state), outputs = { ...legacy, 'versions.json': '{"descriptions":1}' }
  candidate.baseline.kind = 'verified-import'; candidate.inventory.formats = candidate.inventory.formats.filter(x => x !== 'clarityV2'); candidate.outputDigests = structuredClone(candidate.baseline.outputDigests); candidate.translationFingerprint = null
  const data = { executionRecord: Buffer.from(canonical({ runId: 'fixture-run', accepted: candidate.accepted, outputCommit: candidate.baseline.outputCommit, outputTree: candidate.baseline.outputTree, publisher: candidate.publisher, manifest: candidate.manifest })), dependencies: Buffer.from(canonical(candidate.publisher)), manifest, graphProof: Buffer.from(canonical(candidate.graph)), legacyMapping: Buffer.from(JSON.stringify({ formats: Object.fromEntries(candidate.inventory.formats.map(x => [x, `descriptions/${x}.json`])), ownership: Object.fromEntries(Object.keys(candidate.components).map(x => [x, String(candidate.graph[x]?.aliasOf ?? x)])) })), outputProof: Buffer.from(canonical(outputs)) }
  const artifacts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.toString('base64')]))
  const evidence = { executionRecordDigest: digest(data.executionRecord), dependenciesDigest: digest(data.dependencies), manifestBytesDigest: digest(data.manifest), graphProofDigest: digest(data.graphProof), legacyMappingDigest: digest(data.legacyMapping), outputProofDigest: digest(data.outputProof) }
  candidate.baseline.proof = { evidenceDigest: digest(canonical(evidence)), keyFingerprint: digest(publicKey.export({ type: 'spki', format: 'der' })) }
  evidence.signature = sign(null, Buffer.from(canonical({ candidate, evidence })), privateKey).toString('base64')
  assert.equal((await previewBaselineImport({ candidate, outputs, evidence, artifacts, trustedPublicKey: publicKey })).result, 'dry-run')
  assert.equal(Object.hasOwn(outputs, 'descriptions/clarityV2.json'), false)
  await assert.rejects(previewBaselineImport({ candidate: { ...candidate, accepted: { ...candidate.accepted, ref: 'other' } }, outputs, evidence, artifacts, trustedPublicKey: publicKey }), /provenance mismatch/)
  await assert.rejects(previewBaselineImport({ candidate, outputs, evidence, artifacts: { ...artifacts, legacyMapping: Buffer.from('{}').toString('base64') }, trustedPublicKey: publicKey }), /artifact digest mismatch/)
})
