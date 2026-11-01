import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { resolveAccepted, resolveManifestIdentity, fetchPinnedInventory } from '../scripts/resolve-inputs.mjs'
test('accepted content is bound to immutable commit and verified Git blob', async () => {
  const commit = 'a'.repeat(40), bytes = Buffer.from('{"perks":{}}')
  const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  const calls = []
  const result = await resolveAccepted(async (_method, path) => { calls.push(path); return path.startsWith('/git/ref/') ? { object: { sha: commit } } : { encoding: 'base64', sha, content: bytes.toString('base64') } }, 'converter')
  assert.equal(result.commit, commit); assert.match(calls[1], new RegExp(commit))
  await assert.rejects(resolveAccepted(async (_m, path) => path.startsWith('/git/ref/') ? { object: { sha: commit } } : { encoding: 'base64', sha: 'b'.repeat(40), content: bytes.toString('base64') }, 'converter'), /digest mismatch/)
})
test('manifest identity pins inventory path and rejects malformed metadata', async () => {
  const identity = await resolveManifestIdentity(async () => ({ Response: { version: '1', jsonWorldComponentContentPaths: { en: { DestinyInventoryItemDefinition: '/v1.json' } } } }))
  const result = await fetchPinnedInventory(async url => { assert.equal(url, 'https://www.bungie.net/v1.json'); return '{}' }, identity)
  assert.match(result.sha256, /^[a-f0-9]{64}$/)
  await assert.rejects(resolveManifestIdentity(async () => ({})), /Invalid/)
})
