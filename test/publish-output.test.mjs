import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publishAtomic } from '../scripts/publish-output.mjs'
function fake() {
  const commits = new Map([['root', { parent: null, value: { en: 'old', de: 'old', version: 1 } }]])
  let head = 'root', count = 0, behavior = []
  return {
    commits, setBehavior: b => { behavior = b },
    readHead: async () => ({ head, value: structuredClone(commits.get(head).value) }),
    stage: async (parent, value) => { const id = `c${++count}`; commits.set(id, { parent, value }); return id },
    update: async (parent, commit) => {
      const action = behavior.shift()
      if (action === 'race') { const id = `c${++count}`; commits.set(id, { parent: head, value: { ...commits.get(head).value, en: 'newer' } }); head = id; throw Object.assign(new Error('race'), { code: 422 }) }
      if (action === 'fail') throw new Error('upload failed')
      if (parent !== head) throw Object.assign(new Error('race'), { code: 409 })
      head = commit
      if (action === 'ambiguous') throw Object.assign(new Error('unknown'), { code: 'ambiguous' })
    },
    isAncestor: async (ancestor, child) => { while (child) { if (child === ancestor) return true; child = commits.get(child)?.parent } return false }
  }
}
test('CAS conflict recomposes against newer English and bumps version once', async () => {
  const git = fake(); git.setBehavior(['race'])
  const result = await publishAtomic(git, async current => ({ ...current.value, de: 'translated', version: current.value.version + 1 }))
  assert.equal(result.result, 'published')
  assert.deepEqual((await git.readHead()).value, { en: 'newer', de: 'translated', version: 2 })
})
test('ambiguous successful update reconciles without duplicate version', async () => {
  const git = fake(); git.setBehavior(['ambiguous'])
  const result = await publishAtomic(git, async current => ({ ...current.value, version: current.value.version + 1 }))
  assert.equal(result.result, 'published'); assert.equal((await git.readHead()).value.version, 2)
})
test('failed update and exhausted conflicts do not publish candidate', async () => {
  const git = fake(); git.setBehavior(['fail'])
  await assert.rejects(publishAtomic(git, async current => ({ ...current.value, de: 'bad' })), /upload failed/)
  assert.equal((await git.readHead()).value.de, 'old')
  git.setBehavior(['race', 'race', 'race'])
  await assert.rejects(publishAtomic(git, async current => ({ ...current.value, de: 'bad' })), /retry limit/)
  assert.equal((await git.readHead()).value.de, 'old')
})
test('source replans exhaust safely before the ref changes', async () => {
  const git = fake(); let attempts = 0
  await assert.rejects(publishAtomic(git, async current => ({ ...current.value, beforeUpdate: async () => { attempts++; throw Object.assign(new Error('source moved'), { code: 'replan' }) } })), /retry limit/)
  assert.equal(attempts, 3); assert.equal((await git.readHead()).head, 'root')
})
