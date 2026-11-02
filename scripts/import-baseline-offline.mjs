import { createPublicKey, verify } from 'node:crypto'
import { canonical, digest } from './publish-preflight.mjs'
import { graphOf, requiredFormats, validateInitialized } from './state-v2.mjs'
const sha256 = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)

// Offline-only verification. The trust key must be independently authorized;
// a valid signature proves attestation integrity, not that the signer was right.
export async function previewBaselineImport({ candidate, outputs, evidence, artifacts, trustedPublicKey }) {
  if (!candidate || candidate.baseline?.kind !== 'verified-import' || !trustedPublicKey) throw new Error('Verified baseline and independent verifier required')
  if (!evidence || !sha256(evidence.executionRecordDigest) || !sha256(evidence.dependenciesDigest) || !sha256(evidence.manifestBytesDigest) || !sha256(evidence.graphProofDigest) || !sha256(evidence.legacyMappingDigest) || !sha256(evidence.outputProofDigest) || evidence.manifestBytesDigest !== candidate.manifest?.digest || evidence.graphProofDigest !== digest(canonical(graphOf(candidate.source?.value)))) throw new Error('Incomplete baseline provenance')
  validateInitialized(candidate, outputs)
  if (candidate.translationFingerprint !== null) throw new Error('Imported legacy fingerprint must remain unknown')
  if (canonical(candidate.outputDigests) !== canonical(candidate.baseline.outputDigests)) throw new Error('Baseline output bytes changed')
  const names = { executionRecord: 'executionRecordDigest', dependencies: 'dependenciesDigest', manifest: 'manifestBytesDigest', graphProof: 'graphProofDigest', legacyMapping: 'legacyMappingDigest', outputProof: 'outputProofDigest' }
  if (!artifacts || Object.entries(names).some(([name, key]) => typeof artifacts[name] !== 'string' || digest(Buffer.from(artifacts[name], 'base64')) !== evidence[key])) throw new Error('Baseline artifact digest mismatch')
  const parse = name => JSON.parse(Buffer.from(artifacts[name], 'base64').toString('utf8'))
  const execution = parse('executionRecord'), dep = parse('dependencies'), graph = parse('graphProof'), mapping = parse('legacyMapping'), expectedOutputs = parse('outputProof')
  const legacyFormats = requiredFormats.filter(x => x !== 'clarityV2').sort()
  if (canonical(dep) !== canonical(candidate.publisher) || canonical(graph) !== canonical(candidate.graph) || !mapping || typeof mapping !== 'object' || canonical(Object.keys(mapping.formats ?? {}).sort()) !== canonical(legacyFormats) || legacyFormats.some(name => mapping.formats[name] !== `descriptions/${name}.json`) || !mapping.ownership || canonical(Object.keys(mapping.ownership).sort()) !== canonical(Object.keys(candidate.components).sort()) || Object.entries(mapping.ownership).some(([id, owner]) => typeof owner !== 'string' || !Object.hasOwn(candidate.components, owner) || owner !== String(candidate.graph[id]?.aliasOf ?? id))) throw new Error('Baseline graph, dependency or mapping mismatch')
  if (!execution || typeof execution.runId !== 'string' || !execution.runId || canonical(execution.accepted) !== canonical(candidate.accepted) || execution.outputCommit !== candidate.baseline.outputCommit || execution.outputTree !== candidate.baseline.outputTree || canonical(execution.publisher) !== canonical(candidate.publisher) || canonical(execution.manifest) !== canonical(candidate.manifest)) throw new Error('Baseline execution provenance mismatch')
  if (canonical(expectedOutputs) !== canonical(outputs)) throw new Error('Baseline output proof mismatch')
  if (typeof evidence.signature !== 'string') throw new Error('Missing baseline signature')
  const { signature, ...statement } = evidence
  let valid = false
  try {
    const key = trustedPublicKey?.type === 'public' ? trustedPublicKey : createPublicKey(trustedPublicKey)
    if (candidate.baseline.proof.evidenceDigest !== digest(canonical(statement)) || candidate.baseline.proof.keyFingerprint !== digest(key.export({ type: 'spki', format: 'der' }))) throw new Error('Proof identity mismatch')
    valid = verify(null, Buffer.from(canonical({ candidate, evidence: statement })), key, Buffer.from(signature, 'base64'))
  } catch { valid = false }
  if (!valid) throw new Error('Unverified baseline provenance')
  return { result: 'dry-run', operation: candidate.baseline.operation, outputCommit: candidate.baseline.outputCommit }
}
