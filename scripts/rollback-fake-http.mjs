// Rollback exercise for fake Git only. A real compensating publication still
// requires a separately authorized, reviewed operation and verified backups.
import { createHash } from 'node:crypto'
import { digest, canonical } from './publish-preflight.mjs'
import { readPublishedTree } from './read-published-tree.mjs'
import { gitDataAdapter } from './git-data-adapter.mjs'
const [endpoint] = process.argv.slice(2)
if (!endpoint) throw new Error('Usage: node scripts/rollback-fake-http.mjs http://127.0.0.1:PORT')
const base = new URL(endpoint)
if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || !base.port || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Only explicit loopback fake HTTP is allowed')
const call = async (method, path, body) => {
  let response
  try { response = await fetch(new URL(path, base), { method, redirect: 'error', headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }) }
  catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous update'), { code: 'ambiguous', cause: error }); throw error }
  if (!response.ok) throw Object.assign(new Error(`fake HTTP ${response.status}`), { code: response.status })
  try { return await response.json() } catch (error) { if (method === 'PATCH') throw Object.assign(new Error('ambiguous response'), { code: 'ambiguous', cause: error }); throw error }
}
const adapter = gitDataAdapter(call, 'heads/output', readPublishedTree), current = await adapter.readHead()
const baseline = current.state.baseline
if (baseline.kind !== 'initial-publication') throw new Error('Fixture rollback requires an initial-publication baseline')
if (!(await adapter.isAncestor(baseline.outputCommit, current.head))) throw new Error('Baseline is not an ancestor')
const oldCommit = await call('GET', `/git/commits/${baseline.outputCommit}`)
if (oldCommit.tree.sha !== baseline.outputTree) throw new Error('Baseline tree mismatch')
const tree = await call('GET', `/git/trees/${baseline.outputTree}?recursive=1`)
if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete baseline tree')
const files = {}
for (const entry of tree.tree) {
  if (entry.type !== 'blob' || !Object.hasOwn(baseline.outputDigests, entry.path)) continue
  const blob = await call('GET', `/git/blobs/${entry.sha}`)
  if (blob.encoding !== 'base64') throw new Error('Invalid baseline blob')
  const bytes = Buffer.from(blob.content, 'base64')
  if (createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== entry.sha || digest(bytes) !== baseline.outputDigests[entry.path]) throw new Error('Baseline digest mismatch')
  files[entry.path] = bytes.toString('utf8')
}
if (canonical(Object.keys(files).sort()) !== canonical(Object.keys(baseline.outputDigests).sort())) throw new Error('Incomplete baseline')
for (const path of Object.keys(current.files)) if (path.startsWith('descriptions/') && !Object.hasOwn(files, path)) files[path] = null
files['.publication-state.json'] = null
const commit = await adapter.stage(current.head, { files, message: 'Restore legacy baseline (fake only)' })
if ((await call('GET', '/git/ref/heads/output')).object.sha !== current.head) throw new Error('Output head changed; replan')
try { await adapter.update(current.head, commit) } catch (error) {
  if (error.code !== 'ambiguous') throw error
  const observed = (await call('GET', '/git/ref/heads/output')).object.sha
  if (observed !== commit && !(await adapter.isAncestor(commit, observed))) throw error
}
console.log(JSON.stringify({ result: 'rolled-back-fake', commit, restored: baseline.outputCommit }))
