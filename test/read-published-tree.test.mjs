import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { bootstrapState } from '../scripts/publication-state.mjs'
import { readPublishedTree } from '../scripts/read-published-tree.mjs'
test('rejects unsupported state and fails closed on missing state', async () => {
  const descriptions = { 'descriptions/a.json': '{}' }, files = { ...descriptions, 'versions.json': '{"descriptions":1}', '.publication-state.json': JSON.stringify(bootstrapState(descriptions)) }, blobs = new Map()
  const entries = Object.entries(files).map(([path, text]) => { const bytes = Buffer.from(text), sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'); blobs.set(sha, bytes.toString('base64')); return { path, sha, type: 'blob' } })
  const call = async (_m, path) => path.startsWith('/git/trees/') ? { tree: entries, truncated: false } : { encoding: 'base64', content: blobs.get(path.split('/').at(-1)) }
  await assert.rejects(readPublishedTree('tree', call), /recovery-required/)
  entries.splice(entries.findIndex(x => x.path === '.publication-state.json'), 1)
  await assert.rejects(readPublishedTree('tree', call), /explicit bootstrap/)
})
