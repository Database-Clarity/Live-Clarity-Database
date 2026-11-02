import { canonical, digest } from './publish-preflight.mjs'
import { topology, dependencies, implicitDependencies, structuralQueue } from './structural-queue.mjs'
import { createHash } from 'node:crypto'

const sha1 = x => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x)
const sha256 = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const own = (o, k) => Object.hasOwn(o, k)
const fail = () => { throw new Error('recovery-required: invalid publication state') }
const formats = ['braytech', 'clarity', 'clarityV2', 'crayon', 'dim', 'foundry', 'lightGG', 'vaultZero']
export const requiredFormats = formats
export const sourceKey = (repository, commit, blob) => `${repository}@${commit}:${blob}`
export function retainedSourceRows(state, snapshots) {
  const byCommit = new Map()
  for (const snapshot of Object.values(snapshots)) {
    const key = `${snapshot.repository}@${snapshot.commit}`
    if (byCommit.has(key) && byCommit.get(key).blob !== snapshot.blob) fail()
    byCommit.set(key, snapshot)
  }
  const result = {}
  for (const id of Object.keys(state.retainedLanguages ?? {})) {
    const component = state.components[id]
    const snapshot = component?.translations && byCommit.get(`${component.sourceRepo}@${component.translations}`)
    const row = snapshot?.value?.perks?.[id]
    if (!row) fail()
    result[id] = [row]
  }
  return result
}
export function graphOf(source) {
  if (!record(source?.perks)) fail()
  return Object.fromEntries(Object.entries(source.perks).map(([id, row]) => [id, topology(row)]))
}
export function inspectState(raw, outputs, accepted, observedOutput, currentFingerprint = null) {
  if (raw == null) return { status: 'initialization-required', accepted: { repository: accepted.repository ?? null, ref: accepted.ref ?? null, commit: accepted.commit, blob: accepted.blob }, observedOutput, publishedCoverage: 'unknown', pendingAcceptedWork: true }
  try {
    const state = typeof raw === 'string' ? JSON.parse(raw) : raw
    validateInitialized(state, outputs)
    const retainedLanguages = state.retainedLanguages ?? {}
    const sourceUnevaluated = accepted.repository !== state.accepted.repository || accepted.ref !== state.accepted.ref || accepted.commit !== state.accepted.commit || accepted.blob !== state.accepted.blob
    const translationFreshness = !sha256(currentFingerprint) || !state.translationFingerprint ? 'unknown' : currentFingerprint !== state.translationFingerprint ? 'pending' : Object.keys(retainedLanguages).length ? 'retained' : 'current'
    const knownPending = sourceUnevaluated || state.pending.length > 0 || Object.keys(retainedLanguages).length > 0 || translationFreshness === 'pending'
    return { status: 'initialized', pending: state.pending, retainedLanguages, translationFreshness, accepted: { repository: accepted.repository ?? null, ref: accepted.ref ?? null, commit: accepted.commit, blob: accepted.blob }, lastEvaluatedAcceptedSource: state.accepted, pendingAcceptedWork: knownPending ? true : translationFreshness === 'unknown' ? null : false, observedOutput }
  } catch { return { status: 'recovery-required', accepted: { repository: accepted.repository ?? null, ref: accepted.ref ?? null, commit: accepted.commit, blob: accepted.blob }, observedOutput, publishedCoverage: 'unknown' } }
}
export function validateInitialized(s, outputs) {
  if (!record(s) || s.schemaVersion !== 2 || s.initialized !== true || !record(s.baseline) || !['initial-publication', 'verified-import'].includes(s.baseline.kind) || !sha1(s.baseline.outputCommit) || !sha1(s.baseline.outputTree) || !sha256(s.baseline.operation) || !record(s.accepted) || !sha1(s.accepted.commit) || !sha1(s.accepted.blob) || !record(s.source) || !sha256(s.source.digest) || digest(canonical(s.source.value)) !== s.source.digest || !record(s.graph) || !record(s.publisher) || !sha256(s.publisher.identity) || !sha256(s.publisher.lock) || !sha1(s.publisher.converter) || !s.publisher.runtime || !s.publisher.toolbox || !record(s.manifest) || !s.manifest.version || !s.manifest.path || !sha256(s.manifest.digest) || !record(s.inventory) || !Array.isArray(s.inventory.formats) || !Array.isArray(s.inventory.languages) || !s.inventory.languages.includes('en') || !record(s.components) || !Array.isArray(s.pending) || !(s.translationFingerprint === null || sha256(s.translationFingerprint)) || !record(s.outputDigests)) fail()
  if (typeof s.source.bytes !== 'string') fail()
  const sourceBytes = Buffer.from(s.source.bytes, 'base64')
  try {
    if (sourceBytes.toString('base64') !== s.source.bytes || createHash('sha1').update(`blob ${sourceBytes.length}\0`).update(sourceBytes).digest('hex') !== s.accepted.blob || canonical(JSON.parse(sourceBytes.toString('utf8'))) !== canonical(s.source.value)) fail()
  } catch { fail() }
  const inventory = [...s.inventory.formats].sort()
  const fullFormats = [...formats].sort(), legacyFormats = formats.filter(name => name !== 'clarityV2').sort()
  if (canonical(inventory) !== canonical(fullFormats) && !(s.baseline.kind === 'verified-import' && canonical(inventory) === canonical(legacyFormats))) fail()
  const expected = [...inventory.map(x => `descriptions/${x}.json`), 'versions.json'].sort()
  const baselineExpected = [...formats.filter(name => name !== 'clarityV2').map(name => `descriptions/${name}.json`), 'versions.json'].sort()
  if (!record(s.baseline.outputDigests) || canonical(Object.keys(s.baseline.outputDigests).sort()) !== canonical(baselineExpected) || Object.values(s.baseline.outputDigests).some(value => !sha256(value))) fail()
  if (s.baseline.kind === 'verified-import' && (!record(s.baseline.proof) || !sha256(s.baseline.proof.evidenceDigest) || !sha256(s.baseline.proof.keyFingerprint))) fail()
  if (!record(outputs) || canonical(Object.keys(outputs).sort()) !== canonical(expected) || canonical(Object.keys(s.outputDigests).sort()) !== canonical(expected)) fail()
  for (const path of expected) if (!sha256(s.outputDigests[path]) || digest(outputs[path]) !== s.outputDigests[path]) fail()
  try {
    const versions = JSON.parse(outputs['versions.json'])
    if (!Number.isFinite(versions.descriptions) || versions.descriptions < 0) fail()
    for (const path of expected.filter(path => path.startsWith('descriptions/'))) {
      const rows = JSON.parse(outputs[path])
      if (!record(rows)) fail()
    }
  } catch { fail() }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(s.accepted.repository) || typeof s.accepted.ref !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(s.accepted.ref)) fail()
  const snapshots = { [sourceKey(s.accepted.repository, s.accepted.commit, s.accepted.blob)]: { ...s.source, repository: s.accepted.repository, commit: s.accepted.commit, blob: s.accepted.blob }, ...(s.sourceSnapshots ?? {}) }
  for (const [key, snapshot] of Object.entries(snapshots)) {
    const blob = snapshot.blob
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(snapshot.repository) || key !== sourceKey(snapshot.repository, snapshot.commit, blob) || !sha1(blob) || !sha1(snapshot.commit) || typeof snapshot.bytes !== 'string' || !sha256(snapshot.digest)) fail()
    const bytes = Buffer.from(snapshot.bytes, 'base64')
    try { if (bytes.toString('base64') !== snapshot.bytes || createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== blob || digest(canonical(snapshot.value)) !== snapshot.digest || canonical(JSON.parse(bytes.toString('utf8'))) !== canonical(snapshot.value)) fail() } catch { fail() }
  }
  const snapshotCommits = new Set(Object.values(snapshots).map(source => `${source.repository}@${source.commit}`))
  if (canonical(Object.keys(s.components).sort()) !== canonical(Object.keys(s.graph).sort())) fail()
  for (const [id, component] of Object.entries(s.components)) {
    if (!/^\d+$/.test(id) || !record(component) || !sha1(component.sourceCommit) || !sha1(component.sourceBlob) || !own(component, 'topology') || !Array.isArray(component.dependencies) || ![component.english, component.translations].every(x => x === null || sha1(x))) fail()
    const snapshot = snapshots[sourceKey(component.sourceRepo, component.sourceCommit, component.sourceBlob)]
    const row = snapshot?.value?.perks?.[id]
    if (!snapshot || snapshot.repository !== component.sourceRepo || snapshot.commit !== component.sourceCommit || !row || canonical(component.topology) !== canonical(topology(row)) || canonical(component.topology) !== canonical(s.graph[id]) || canonical(component.dependencies) !== canonical([...new Set(dependencies(row))].sort()) || canonical(component.implicitDependencies) !== canonical(implicitDependencies(row)) || [...component.dependencies, ...component.implicitDependencies].some(dep => !own(s.components, dep))) fail()
    for (const watermark of [component.english, component.translations]) {
      if (watermark && !snapshotCommits.has(`${component.sourceRepo}@${watermark}`)) fail()
    }
  }
  if (s.retainedLanguages !== undefined) {
    if (!record(s.retainedLanguages)) fail()
    for (const [id, langs] of Object.entries(s.retainedLanguages)) {
      if (!own(s.components, id) || !Array.isArray(langs) || !langs.length || langs.some(lang => typeof lang !== 'string' || !/^[a-zA-Z-]+$/.test(lang) || lang === 'en') || new Set(langs).size !== langs.length || canonical(langs) !== canonical([...langs].sort())) fail()
    }
  }
  const members = new Set(), generations = new Set()
  for (const q of s.pending) {
    if (!record(q) || !sha256(q.generation) || !sha1(q.sourceCommit) || !sha1(q.sourceBlob) || !snapshots[sourceKey(q.sourceRepo, q.sourceCommit, q.sourceBlob)] || !Array.isArray(q.members) || !q.members.length || generations.has(q.generation)) fail()
    const queuedSource = snapshots[sourceKey(q.sourceRepo, q.sourceCommit, q.sourceBlob)].value.perks
    if (canonical(q.members) !== canonical([...q.members].sort()) || digest(canonical({ sourceCommit: q.sourceCommit, members: q.members, topology: q.members.map(id => [id, topology(queuedSource[id])]) })) !== q.generation) fail()
    generations.add(q.generation)
    for (const id of q.members) { if (!/^\d+$/.test(id) || members.has(id)) fail(); members.add(id) }
  }
  const published = Object.fromEntries(Object.entries(s.components).map(([id, component]) => [id, snapshots[sourceKey(component.sourceRepo, component.sourceCommit, component.sourceBlob)].value.perks[id]]))
  const expectedQueue = structuralQueue(published, s.source.value.perks, s.accepted.commit, retainedSourceRows(s, snapshots)).map(item => ({ ...item, sourceRepo: s.accepted.repository, sourceBlob: s.accepted.blob }))
  if (canonical(expectedQueue) !== canonical(s.pending)) fail()
  return s
}
