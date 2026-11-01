import { test } from 'node:test'
import assert from 'node:assert/strict'
import { structuralQueue } from '../scripts/structural-queue.mjs'
const sha = 'a'.repeat(40)
const before = { 1: {}, 2: {}, 3: {}, 100: { editor: { en: { main: 'A' } } }, 200: { aliasOf: 100, aliasKind: 'frame' }, 300: { editor: { en: { main: 'independent' } } }, 400: { editor: { en: { main: 'import main from 200' } } } }
test('retarget queues old and new dependency closure while independent text stays outside', () => {
  const after = { ...before, 200: { aliasOf: 300, aliasKind: 'frame' }, 500: { editor: { en: { main: 'separate' } } } }
  const queue = structuralQueue(before, after, sha)
  assert.deepEqual(queue.map(x => x.members), [['100', '200', '300', '400'], ['500']])
  assert.equal(queue[0].sourceCommit, sha)
  assert.notEqual(queue[0].generation, structuralQueue(before, after, 'b'.repeat(40))[0].generation)
})
test('text-only edits do not create structural queue; missing references fail closed', () => {
  assert.deepEqual(structuralQueue(before, { ...before, 300: { editor: { en: { main: 'new' } } } }, sha), [])
  assert.throws(() => structuralQueue(before, { ...before, 200: { aliasOf: 999 } }, sha), /Missing dependency/)
})
