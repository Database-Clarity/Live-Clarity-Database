import { test } from 'node:test'
import assert from 'node:assert/strict'
import { githubTransport } from '../scripts/github-transport.mjs'
test('transport maps ambiguous PATCH failures and retains CAS conflict status', async () => {
  const make = fetchImpl => githubTransport({ owner: 'test', repo: 'repo', token: 'test', fetchImpl })
  await assert.rejects(make(async () => { throw new Error('disconnect') })('PATCH', '/git/refs/heads/test', {}), { code: 'ambiguous' })
  await assert.rejects(make(async () => ({ ok: false, status: 422 }))('PATCH', '/git/refs/heads/test', {}), { code: 422 })
  await assert.rejects(make(async () => ({ ok: false, status: 500 }))('PATCH', '/git/refs/heads/test', {}), { code: 'ambiguous' })
})
