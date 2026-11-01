import { createHash } from 'node:crypto'
import { verifyOutputDigests } from './publication-state.mjs'
// Decode from the tree of a particular output commit, never from a moving ref.
export async function readPublishedTree(treeSha, call) {
  const tree = await call('GET', `/git/trees/${treeSha}?recursive=1`)
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete output tree')
  const selected = tree.tree.filter(x => x.type === 'blob' && (/^descriptions\/[A-Za-z0-9_-]+\.json$/.test(x.path) || x.path === 'versions.json' || x.path === '.publication-state.json'))
  const files = {}
  for (const entry of selected) {
    const blob = await call('GET', `/git/blobs/${entry.sha}`)
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('Invalid Git blob')
    const bytes = Buffer.from(blob.content.replace(/\s/g, ''), 'base64')
    const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
    if (actual !== entry.sha) throw new Error(`Output blob mismatch: ${entry.path}`)
    files[entry.path] = bytes.toString('utf8')
  }
  if (!files['.publication-state.json'] || !files['versions.json']) throw new Error('Publication state or version missing; explicit bootstrap required')
  const state = JSON.parse(files['.publication-state.json']), versions = JSON.parse(files['versions.json'])
  const descriptions = Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith('descriptions/')))
  verifyOutputDigests(state, descriptions)
  return { state, versions, files: descriptions }
}
