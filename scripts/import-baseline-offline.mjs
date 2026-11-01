import { canonical, digest } from './publish-preflight.mjs'
import { graphOf, validateInitialized } from './state-v2.mjs'
const sha256 = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)

// Provenance verification is an explicit trust boundary. This offline planner
// produces no output write and cannot certify that a caller's verifier is valid.
export async function previewBaselineImport({ candidate, outputs, evidence, verifyProvenance }) {
  if (!candidate || candidate.baseline?.kind !== 'verified-import' || typeof verifyProvenance !== 'function') throw new Error('Verified baseline and independent verifier required')
  if (!evidence || !sha256(evidence.executionRecordDigest) || !sha256(evidence.dependenciesDigest) || !sha256(evidence.manifestBytesDigest) || !sha256(evidence.graphProofDigest) || !sha256(evidence.legacyMappingDigest) || evidence.manifestBytesDigest !== candidate.manifest?.digest || evidence.graphProofDigest !== digest(canonical(graphOf(candidate.source?.value)))) throw new Error('Incomplete baseline provenance')
  validateInitialized(candidate, outputs)
  if (!(await verifyProvenance(evidence, candidate, outputs))) throw new Error('Unverified baseline provenance')
  return { result: 'dry-run', operation: candidate.baseline.operation, outputCommit: candidate.baseline.outputCommit }
}
