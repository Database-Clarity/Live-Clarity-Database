import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bootstrapState, validateState, verifyOutputDigests } from '../scripts/publication-state.mjs'
import { gitDataAdapter } from '../scripts/git-data-adapter.mjs'
const source = 'a'.repeat(40), generation = 'b'.repeat(64)
test('bootstrap records unknown translation provenance and detects corrupt bytes or state', () => {
  const outputs = { 'descriptions/clarity.json': '{"x":1}' }
  const state = bootstrapState(outputs)
  assert.equal(state.translationFingerprint, null)
  verifyOutputDigests(state, outputs)
  assert.throws(() => verifyOutputDigests(state, { 'descriptions/clarity.json': '{}' }), /digest mismatch/)
  assert.throws(() => validateState({ ...state, pending: [{ generation, sourceCommit: source, members: ['4'] }, { generation: 'c'.repeat(64), sourceCommit: source, members: ['4'] }] }), /Overlapping/)
  assert.throws(() => validateState({ ...state, components: { 4: { topology: {}, english: 'bad', translations: null } } }), /watermark/)
})
test('Git data adapter stages one parent tree and updates without force', async () => {
  const calls = []
  const transport = async (method, path, body) => {
    calls.push({ method, path, body })
    if (path.startsWith('/git/ref/')) return { object: { sha: 'head' } }
    if (path.startsWith('/git/commits/')) return { tree: { sha: 'base' } }
    if (path === '/git/blobs') return { sha: 'blob' }
    if (path === '/git/trees') return { sha: 'tree' }
    if (path === '/git/commits') return { sha: 'commit' }
    if (path.startsWith('/compare/')) return { status: 'ahead' }
    return {}
  }
  const adapter = gitDataAdapter(transport, 'heads/output', async () => ({ value: 1 }))
  assert.equal((await adapter.readHead()).head, 'head')
  const commit = await adapter.stage('head', { files: { 'versions.json': '{}', '.publication-state.json': '{}' }, message: 'Publish' })
  await adapter.update('head', commit)
  assert.deepEqual(calls.find(c => c.path === '/git/commits').body.parents, ['head'])
  assert.equal(calls.find(c => c.path === '/git/trees').body.base_tree, 'base')
  assert.deepEqual(calls.find(c => c.method === 'PATCH').body, { sha: 'commit', force: false })
  assert.equal(await adapter.isAncestor('head', 'commit'), true)
  await assert.rejects(adapter.stage('head', { files: { 'README.md': 'bad' }, message: 'bad' }), /Unexpected/)
})
