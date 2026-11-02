// Offline fixture import: loopback HTTP only. The supplied trust key and
// attestation are test inputs, not an authorization for real publication.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gitDataAdapter } from './git-data-adapter.mjs'
import { previewBaselineImport } from './import-baseline-offline.mjs'
import { resolveAccepted } from './resolve-inputs.mjs'

const [endpoint, bundlePath] = process.argv.slice(2)
if (!endpoint || !bundlePath) throw new Error('Usage: node scripts/import-baseline-fake-http.mjs http://127.0.0.1:PORT BUNDLE.json')
const base = new URL(endpoint)
if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || !base.port || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Only explicit loopback fake HTTP is allowed')
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'))
const call = async (method, path, body) => {
  let response
  try { response = await fetch(new URL(path, base), { method, redirect: 'error', headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }) }
  catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous update'), { code: 'ambiguous', cause: error }); throw error }
  if (!response.ok) throw Object.assign(new Error(`fake HTTP ${response.status}`), { code: response.status })
  try { return await response.json() } catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous response'), { code: 'ambiguous', cause: error }); throw error }
}
const readLegacy = async (treeSha, api) => {
  const tree = await api('GET', `/git/trees/${treeSha}?recursive=1`)
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete output tree')
  const files = {}
  for (const entry of tree.tree) {
    if (entry.type !== 'blob' || !/^(descriptions\/[A-Za-z0-9_-]+\.json|versions\.json|\.publication-state\.json)$/.test(entry.path)) continue
    const data = await api('GET', `/git/blobs/${entry.sha}`)
    if (data.encoding !== 'base64') throw new Error('Invalid output blob')
    const bytes = Buffer.from(data.content, 'base64')
    if (createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== entry.sha) throw new Error('Output blob mismatch')
    files[entry.path] = bytes.toString('utf8')
  }
  return { state: files['.publication-state.json'] ?? null, files: Object.fromEntries(Object.entries(files).filter(([path]) => path !== '.publication-state.json')) }
}
const adapter = gitDataAdapter(call, 'heads/output', readLegacy)
const current = await adapter.readHead(), source = await resolveAccepted(call, 'accepted')
if (current.state !== null) throw new Error('Already initialized or recovery required')
if (current.head !== bundle.candidate.baseline.outputCommit || current.tree !== bundle.candidate.baseline.outputTree) throw new Error('Output head changed; replan')
if (source.repository !== bundle.candidate.accepted.repository || source.ref !== bundle.candidate.accepted.ref) throw new Error('Source repository or ref mismatch')
if (source.commit !== bundle.candidate.accepted.commit) {
  const relation = await call('GET', `/compare/${bundle.candidate.accepted.commit}...${source.commit}`)
  if (relation.status !== 'ahead') throw new Error('Baseline source is not an ancestor of accepted head')
  const historical = await call('GET', `/contents/liveDescriptions.json?ref=${bundle.candidate.accepted.commit}`)
  if (historical.encoding !== 'base64' || historical.sha !== bundle.candidate.accepted.blob) throw new Error('Baseline source blob mismatch')
  const bytes = Buffer.from(historical.content.replace(/\s/g, ''), 'base64')
  if (createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== historical.sha || bytes.toString('base64') !== bundle.candidate.source.bytes) throw new Error('Baseline source bytes mismatch')
} else if (source.blob !== bundle.candidate.accepted.blob) throw new Error('Baseline source blob mismatch')
await previewBaselineImport({ candidate: bundle.candidate, outputs: current.files, evidence: bundle.evidence, artifacts: bundle.artifacts, trustedPublicKey: bundle.trustedPublicKey })
const commit = await adapter.stage(current.head, { files: { '.publication-state.json': JSON.stringify(bundle.candidate, null, 1) }, message: 'Import verified baseline (fake only)' })
const latest = await resolveAccepted(call, 'accepted')
if (latest.commit !== source.commit || latest.blob !== source.blob || (await adapter.readHead()).head !== current.head) throw new Error('Pins changed; replan')
try { await adapter.update(current.head, commit) } catch (error) {
  if (error.code !== 'ambiguous') throw error
  const observed = await adapter.readHead()
  if (observed.head !== commit && !(await adapter.isAncestor(commit, observed.head))) throw error
}
console.log(JSON.stringify({ result: 'imported-fake', commit, source: source.commit }))
