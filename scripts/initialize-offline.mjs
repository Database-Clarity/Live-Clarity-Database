import { canonical, digest } from './publish-preflight.mjs'
import { graphOf, requiredFormats, validateInitialized } from './state-v2.mjs'
import { dependencies, implicitDependencies } from './structural-queue.mjs'
import { createHash } from 'node:crypto'

// Offline-only candidate builder. It cannot write Git or enable publication.
// Inputs are supplied by a caller that has pinned and verified all bytes.
export function planInitialization({ accepted, output, publisher, manifest, languages, converted, fingerprint, validateOutput }) {
  if (!/^[a-f0-9]{40}$/.test(accepted?.commit) || !/^[a-f0-9]{40}$/.test(accepted?.blob) || !/^[a-f0-9]{40}$/.test(output?.commit) || !/^[a-f0-9]{40}$/.test(output?.tree) || !accepted.input?.perks || !Number.isFinite(output.versions?.descriptions) || !Array.isArray(languages) || !languages.includes('en') || typeof validateOutput !== 'function') throw new Error('Invalid initialization pins')
  if (output.state != null) throw new Error('Initialization requires missing state')
  if (!(accepted.bytes instanceof Uint8Array) || !(manifest.bytes instanceof Uint8Array)) throw new Error('Pinned source and manifest bytes required')
  const acceptedBytes = Buffer.from(accepted.bytes)
  const blob = createHash('sha1').update(`blob ${acceptedBytes.length}\0`).update(acceptedBytes).digest('hex')
  if (blob !== accepted.blob || canonical(JSON.parse(acceptedBytes.toString('utf8'))) !== canonical(accepted.input) || digest(manifest.bytes) !== manifest.digest) throw new Error('Pinned input digest mismatch')
  JSON.parse(Buffer.from(manifest.bytes).toString('utf8'))
  const repository = accepted.repository ?? 'fixture/accepted'
  const source = accepted.input, graph = graphOf(source), components = {}
  for (const [id, row] of Object.entries(source.perks)) {
    const deps = [...new Set(dependencies(row))].sort()
    const implicit = implicitDependencies(row)
    if ([...deps, ...implicit].some(dep => !Object.hasOwn(source.perks, dep))) throw new Error(`Missing dependency for ${id}`)
    components[id] = { sourceRepo: repository, sourceCommit: accepted.commit, sourceBlob: accepted.blob, topology: graph[id], dependencies: deps, implicitDependencies: implicit, english: accepted.commit, translations: accepted.commit }
  }
  const files = {}, old = output.files
  if (!old || Object.keys(old).some(path => !/^descriptions\/[A-Za-z0-9_-]+\.json$/.test(path))) throw new Error('Invalid legacy output')
  const legacyPaths = requiredFormats.filter(name => name !== 'clarityV2').map(name => `descriptions/${name}.json`).sort()
  if (canonical(Object.keys(old).sort()) !== canonical(legacyPaths) || typeof output.versionBytes !== 'string' || canonical(JSON.parse(output.versionBytes)) !== canonical(output.versions)) throw new Error('Incomplete pinned legacy baseline')
  for (const path of legacyPaths) JSON.parse(old[path])
  if (!converted || canonical(Object.keys(converted).sort()) !== canonical(requiredFormats.map(name => `descriptions/${name}.json`).sort())) throw new Error('Incomplete or unexpected converted output')
  for (const preset of requiredFormats) {
    const path = `descriptions/${preset}.json`, bytes = converted[path]
    if (typeof bytes !== 'string') throw new Error(`Missing output ${path}`)
    JSON.parse(bytes); validateOutput(path, bytes); files[path] = bytes
  }
  const changed = Object.keys(files).some(path => old[path] !== files[path]) || Object.keys(old).some(path => !Object.hasOwn(files, path))
  const versions = { ...output.versions, descriptions: changed ? Math.round(output.versions.descriptions * 10000 + 1) / 10000 : output.versions.descriptions }
  files['versions.json'] = JSON.stringify(versions, null, 1)
  const manifestIdentity = { version: manifest.version, path: manifest.path, digest: manifest.digest }
  const baselineDigests = Object.fromEntries([...Object.entries(old), ['versions.json', output.versionBytes]].map(([path, bytes]) => [path, digest(bytes)]))
  const operation = digest(canonical({ accepted: [repository, accepted.ref ?? 'accepted', accepted.commit, accepted.blob], output: [output.commit, output.tree], baselineDigests, publisher, manifest: manifestIdentity, languages, digests: Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, digest(bytes)])) }))
  const state = { schemaVersion: 2, initialized: true, baseline: { kind: 'initial-publication', outputCommit: output.commit, outputTree: output.tree, operation, outputDigests: baselineDigests }, accepted: { repository, ref: accepted.ref ?? 'accepted', commit: accepted.commit, blob: accepted.blob }, source: { digest: digest(canonical(source)), value: source, bytes: acceptedBytes.toString('base64') }, graph, publisher, manifest: manifestIdentity, inventory: { formats: [...requiredFormats], languages }, components, pending: [], translationFingerprint: fingerprint, outputDigests: Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, digest(bytes)])) }
  validateInitialized(state, files)
  return { parent: output.commit, acceptedCommit: accepted.commit, operation, state, files: { ...files, '.publication-state.json': JSON.stringify(state, null, 1) } }
}

// Only a deliberately in-memory adapter is accepted. No network-capable adapter
// or user-supplied arbitrary implementation can be passed to this dry run.
export function previewInitialization(plan) {
  validateInitialized(plan.state, Object.fromEntries(Object.entries(plan.files).filter(([path]) => path !== '.publication-state.json')))
  return { result: 'dry-run', parent: plan.parent, acceptedCommit: plan.acceptedCommit, operation: plan.operation, files: Object.keys(plan.files).sort() }
}
