import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
const perk = (hash, text, extra = {}) => ({ hash, name: `Perk ${hash}`, type: 'Weapon Perk', uploadedBy: 'tester', updateTracker: { descriptions: {} }, editor: { en: { main: text, secondary: text }, de: { main: `DE ${text}`, secondary: `DE ${text}` } }, lastUpload: 1, inLiveDatabase: true, uploadToLive: true, ...extra })
const source = { perks: { 1: perk(1, ''), 2: perk(2, ''), 3: perk(3, ''), 300: perk(300, 'English'), 500: { hash: 500, aliasOf: 300, aliasKind: 'frame' }, 600: perk(600, 'Other'), 700: perk(700, 'Independent') } }
const outputHead = 'a'.repeat(40), acceptedHead = 'b'.repeat(40), treeHead = 'c'.repeat(40)
async function exercise(scenario) {
  const dir = mkdtempSync(join(tmpdir(), 'split-http-'))
  const inv = join(dir, 'inventory.json'), config = join(dir, 'config.json')
  writeFileSync(inv, '{}'); writeFileSync(config, JSON.stringify({ inventoryPath: inv, manifestVersion: '1', manifestPath: '/pinned.json' }))
  let accepted = acceptedHead, head = outputHead, count = 0, refReads = 0, outputReads = 0, patches = 0
  const blobs = new Map(), trees = new Map(), commits = new Map([[outputHead, { tree: { sha: treeHead } }]])
  const put = bytes => { const sha = gitBlob(bytes); blobs.set(sha, bytes); return sha }
  const entries = [{ path: 'versions.json', type: 'blob', sha: put(Buffer.from('{"descriptions":2.0625}')) }, { path: 'descriptions/clarity.json', type: 'blob', sha: put(Buffer.from('{}')) }, { path: 'README.md', type: 'blob', sha: put(Buffer.from('preserved')) }]
  trees.set(treeHead, entries)
  commits.set('e'.repeat(40), { tree: { sha: treeHead } })
  let sourceBytes = Buffer.from(JSON.stringify(scenario === 'bad-conversion' ? { perks: { 1: perk(1, ''), 2: perk(2, ''), 3: perk(3, ''), 300: perk(300, 'import main from 999') } } : source)), sourceBlob = gitBlob(sourceBytes)
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk; const body = raw ? JSON.parse(raw) : null; const p = req.url; let response, status = 200
    if (p === '/git/ref/heads/accepted') { refReads++; if (scenario === 'source-moves' && refReads === 2) accepted = 'd'.repeat(40); response = { object: { sha: accepted } } }
    else if (p === '/git/ref/heads/output') { outputReads++; if (scenario === 'output-moves' && outputReads === 2) head = 'e'.repeat(40); response = { object: { sha: head } } }
    else if (p.startsWith('/contents/liveDescriptions.json?ref=')) response = { encoding: 'base64', sha: sourceBlob, content: sourceBytes.toString('base64') }
    else if (p.startsWith('/compare/')) response = { status: 'ahead' }
    else if (req.method === 'GET' && p.startsWith('/git/commits/')) response = commits.get(p.split('/').at(-1))
    else if (req.method === 'GET' && p.startsWith('/git/trees/')) response = { tree: trees.get(p.split('/').at(-1).split('?')[0]), truncated: false }
    else if (req.method === 'GET' && p.startsWith('/git/blobs/')) response = { encoding: 'base64', content: blobs.get(p.split('/').at(-1)).toString('base64') }
    else if (req.method === 'POST' && p === '/git/blobs') { if (scenario === 'blob-fails') { status = 500; response = {} } else response = { sha: put(Buffer.from(body.content, 'base64')) } }
    else if (req.method === 'POST' && p === '/git/trees') { if (scenario === 'tree-fails') { status = 500; response = {} } else { const sha = (++count).toString(16).padStart(40, '0'); trees.set(sha, [...trees.get(body.base_tree).filter(x => !body.tree.some(y => y.path === x.path)), ...body.tree]); response = { sha } } }
    else if (req.method === 'POST' && p === '/git/commits') { if (scenario === 'commit-fails') { status = 500; response = {} } else { const sha = (++count).toString(16).padStart(40, '0'); commits.set(sha, { tree: { sha: body.tree }, parents: body.parents }); response = { sha } } }
    else if (req.method === 'PATCH' && p === '/git/refs/heads/output') { patches++; if (scenario === 'ref-fails' || (scenario === 'normal-ref-fails' && patches > 1)) { status = 422; response = {} } else { head = body.sha; if (scenario === 'ambiguous') { res.destroy(); return } response = { object: { sha: head } } } }
    else { status = 404; response = { path: p } }
    res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(response))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const port = server.address().port
    const run = (script = 'initialize-fake-http.mjs', mode) => new Promise(resolve => { const child = spawn(process.execPath, [`scripts/${script}`, `http://127.0.0.1:${port}`, config, ...(mode ? [mode] : [])], { cwd: process.cwd() }); let stdout = '', stderr = ''; child.stdout.on('data', x => { stdout += x }); child.stderr.on('data', x => { stderr += x }); child.on('close', code => resolve({ code, stdout, stderr })) })
    const first = await run(), second = scenario === 'duplicate' ? await run() : null
    let english, translations, afterEnglish, beforeEnglish
    if (scenario === 'unchanged' && first.code === 0) {
      accepted = 'd'.repeat(40)
      translations = await run('publish-fake-http.mjs', 'translations')
    }
    if (['vertical', 'structure', 'reverse', 'normal-ref-fails'].includes(scenario) && first.code === 0) {
      beforeEnglish = trees.get(commits.get(head).tree.sha)
      accepted = 'd'.repeat(40)
      const perks = scenario === 'structure' ? { ...source.perks, 500: { hash: 500, aliasOf: 600, aliasKind: 'frame' }, 700: perk(700, 'Independent changed') } : { ...source.perks, 300: perk(300, 'New English') }
      sourceBytes = Buffer.from(JSON.stringify({ perks })); sourceBlob = gitBlob(sourceBytes)
      if (scenario === 'reverse') {
        translations = await run('publish-fake-http.mjs', 'translations')
        if (translations.code === 0) english = await run('publish-fake-http.mjs', 'english')
        afterEnglish = trees.get(commits.get(head).tree.sha)
      } else {
        english = await run('publish-fake-http.mjs', 'english')
        afterEnglish = trees.get(commits.get(head).tree.sha)
        if (english.code === 0) translations = await run('publish-fake-http.mjs', 'translations')
      }
    }
    return { first, second, english, translations, beforeEnglish, afterEnglish, head, patches, tree: trees.get(commits.get(head)?.tree.sha), blobs }
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }) }
}
test('executable initializes through actual converter and fake HTTP Git objects', async () => {
  const r = await exercise('success'); assert.equal(r.first.code, 0, r.first.stderr); assert.notEqual(r.head, outputHead); assert.equal(r.patches, 1)
  const read = path => JSON.parse(r.blobs.get(r.tree.find(x => x.path === path).sha).toString())
  assert.equal(read('versions.json').descriptions, 2.0626); assert.equal(read('.publication-state.json').initialized, true)
  assert.ok(read('descriptions/clarity.json')['300'].descriptions.de); assert.ok(read('descriptions/clarityV2.json')['500'].aliasOf)
  assert.equal(r.blobs.get(r.tree.find(x => x.path === 'README.md').sha).toString(), 'preserved')
})
test('initialized fixture runs English then translation through fake Git', async () => {
  const r = await exercise('vertical'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const before = read(r.beforeEnglish, 'descriptions/clarity.json')['300'].descriptions
  const after = read(r.afterEnglish, 'descriptions/clarity.json')['300'].descriptions
  const final = read(r.tree, 'descriptions/clarity.json')['300'].descriptions
  assert.notDeepEqual(before.en, after.en); assert.deepEqual(before.de, after.de); assert.notDeepEqual(after.de, final.de)
  for (const item of r.beforeEnglish.filter(x => /^descriptions\/.+\.json$/.test(x.path))) {
    const original = read(r.beforeEnglish, item.path), published = read(r.afterEnglish, item.path)
    for (const [id, row] of Object.entries(original)) {
      for (const [language, value] of Object.entries(row.descriptions ?? {})) {
        if (language !== 'en') assert.equal(JSON.stringify(published[id]?.descriptions?.[language]), JSON.stringify(value), `${item.path} ${id} ${language}`)
      }
      for (const [language, value] of Object.entries(row.updateTracker?.descriptions ?? {})) {
        if (language !== 'en') assert.equal(JSON.stringify(published[id]?.updateTracker?.descriptions?.[language]), JSON.stringify(value), `${item.path} ${id} tracker ${language}`)
      }
    }
  }
})
test('English queues retargeted component and scheduled run promotes all languages', async () => {
  const r = await exercise('structure'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const path = 'descriptions/clarityV2.json', old = read(r.beforeEnglish, path), english = read(r.afterEnglish, path), final = read(r.tree, path)
  assert.equal(old[500].aliasOf, 300); assert.equal(english[500].aliasOf, 300); assert.equal(final[500].aliasOf, 600)
  assert.notDeepEqual(old[700].descriptions.en, english[700].descriptions.en)
  assert.ok(read(r.afterEnglish, '.publication-state.json').pending.some(x => x.members.includes('500')))
  assert.deepEqual(read(r.tree, '.publication-state.json').pending, [])
})
test('translation before English keeps updated translation and advances English', async () => {
  const r = await exercise('reverse'); assert.equal(r.translations.code, 0, r.translations.stderr); assert.equal(r.english.code, 0, r.english.stderr)
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const before = read(r.beforeEnglish, 'descriptions/clarity.json')['300'].descriptions
  const after = read(r.tree, 'descriptions/clarity.json')['300'].descriptions
  assert.notDeepEqual(before.en, after.en); assert.notDeepEqual(before.de, after.de)
})
test('a new accepted commit with identical inputs skips Git writes', async () => {
  const r = await exercise('unchanged'); assert.equal(r.translations.code, 0, r.translations.stderr)
  assert.equal(JSON.parse(r.translations.stdout).result, 'unchanged'); assert.equal(r.patches, 1)
})
test('normal publication ref contention exhausts retries without changing published tree', async () => {
  const r = await exercise('normal-ref-fails'); assert.notEqual(r.english.code, 0); assert.match(r.english.stderr, /retry limit exhausted/)
  assert.equal(r.patches, 4); assert.deepEqual(r.tree, r.beforeEnglish)
})
test('conversion, changed source, blob and ref failures leave published head unchanged', async () => {
  for (const scenario of ['bad-conversion', 'source-moves', 'blob-fails', 'tree-fails', 'commit-fails', 'ref-fails']) { const r = await exercise(scenario); assert.notEqual(r.first.code, 0, scenario); assert.equal(r.head, outputHead, scenario) }
  const moved = await exercise('output-moves'); assert.notEqual(moved.first.code, 0); assert.equal(moved.head, 'e'.repeat(40)); assert.equal(moved.patches, 0)
})
test('ambiguous success reconciles and duplicate initialization cannot replace state', async () => {
  const ambiguous = await exercise('ambiguous'); assert.equal(ambiguous.first.code, 0, ambiguous.first.stderr); assert.equal(ambiguous.patches, 1)
  const duplicate = await exercise('duplicate'); assert.equal(duplicate.first.code, 0, duplicate.first.stderr); assert.equal(duplicate.second.code, 0, duplicate.second.stderr); assert.equal(JSON.parse(duplicate.second.stdout).result, 'already-initialized-fake'); assert.equal(duplicate.patches, 1)
})
