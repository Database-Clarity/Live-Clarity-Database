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
const both = (hash, text) => perk(hash, text, { editor: { en: { main: text, secondary: text }, de: { main: text, secondary: text } } })
const source = { perks: { 1: perk(1, ''), 2: perk(2, ''), 3: perk(3, ''), 300: perk(300, 'English'), 500: { hash: 500, aliasOf: 300, aliasKind: 'frame' }, 600: perk(600, 'Other'), 700: perk(700, 'Independent') } }
const outputHead = 'a'.repeat(40), acceptedHead = 'b'.repeat(40), treeHead = 'c'.repeat(40)
async function exercise(scenario) {
  const dir = mkdtempSync(join(tmpdir(), 'split-http-'))
  const inv = join(dir, 'inventory.json'), config = join(dir, 'config.json')
  writeFileSync(inv, '{}'); writeFileSync(config, JSON.stringify({ inventoryPath: inv, manifestVersion: '1', manifestPath: '/pinned.json', fixtureManifestHttp: true, traceConversions: true }))
  let accepted = acceptedHead, head = outputHead, count = 0, refReads = 0, outputReads = 0, patches = 0, inventoryReads = 0
  let releaseBarrier, signalBarrier
  const barrier = new Promise(resolve => { releaseBarrier = resolve }), barrierSeen = new Promise(resolve => { signalBarrier = resolve })
  let blockedOnce = false
  const blobs = new Map(), trees = new Map(), commits = new Map([[outputHead, { tree: { sha: treeHead } }]])
  const put = bytes => { const sha = gitBlob(bytes); blobs.set(sha, bytes); return sha }
  const entries = [{ path: 'versions.json', type: 'blob', sha: put(Buffer.from('{"descriptions":2.0625}')) }, { path: 'descriptions/clarity.json', type: 'blob', sha: put(Buffer.from('{}')) }, { path: 'README.md', type: 'blob', sha: put(Buffer.from('preserved')) }]
  trees.set(treeHead, entries)
  commits.set('e'.repeat(40), { tree: { sha: treeHead } })
  const baseSource = scenario === 'imports' ? { perks: { ...source.perks, 300: perk(300, 'import main from 600') } } : scenario === 'globals' ? { perks: { ...source.perks, 1: both(1, 'export nested (\nimport main from 600\n)'), 300: both(300, 'import nested from global') } } : source
  let sourceBytes = Buffer.from(JSON.stringify(scenario === 'bad-conversion' ? { perks: { 1: perk(1, ''), 2: perk(2, ''), 3: perk(3, ''), 300: perk(300, 'import main from 999') } } : baseSource)), sourceBlob = gitBlob(sourceBytes)
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk; const body = raw ? JSON.parse(raw) : null; const p = req.url; let response, status = 200
    if (p === '/git/ref/heads/accepted') { refReads++; if (scenario === 'source-moves' && refReads === 2) accepted = 'd'.repeat(40); response = { object: { sha: accepted } } }
    else if (p === '/git/ref/heads/output') { outputReads++; if (scenario === 'output-moves' && outputReads === 2) head = 'e'.repeat(40); response = { object: { sha: head } } }
    else if (p.startsWith('/contents/liveDescriptions.json?ref=')) response = { encoding: 'base64', sha: sourceBlob, content: sourceBytes.toString('base64') }
    else if (p.startsWith('/compare/')) response = { status: scenario === 'diverged' ? 'diverged' : 'ahead' }
    else if (p === '/fixture/manifest') response = scenario === 'manifest-fails' ? {} : { Response: { version: scenario === 'manifest-changed' ? '2' : '1', jsonWorldComponentContentPaths: { en: { DestinyInventoryItemDefinition: '/pinned.json' } } } }
    else if (p.startsWith('/fixture/inventory?')) { inventoryReads++; response = { path: new URL(p, 'http://localhost').searchParams.get('path'), content: Buffer.from('{}').toString('base64') } }
    else if (req.method === 'GET' && p.startsWith('/git/commits/')) response = commits.get(p.split('/').at(-1))
    else if (req.method === 'GET' && p.startsWith('/git/trees/')) response = { tree: trees.get(p.split('/').at(-1).split('?')[0]), truncated: false }
    else if (req.method === 'GET' && p.startsWith('/git/blobs/')) response = { encoding: 'base64', content: blobs.get(p.split('/').at(-1)).toString('base64') }
    else if (req.method === 'POST' && p === '/git/blobs') { if (scenario === 'blob-fails' || (scenario === 'normal-blob-fails' && patches >= 1)) { status = 500; response = {} } else response = { sha: put(Buffer.from(body.content, 'base64')) } }
    else if (req.method === 'POST' && p === '/git/trees') { if (scenario === 'tree-fails' || (scenario === 'normal-tree-fails' && patches >= 1)) { status = 500; response = {} } else { const sha = (++count).toString(16).padStart(40, '0'); trees.set(sha, [...trees.get(body.base_tree).filter(x => !body.tree.some(y => y.path === x.path)), ...body.tree]); response = { sha } } }
    else if (req.method === 'POST' && p === '/git/commits') { if (scenario === 'commit-fails' || (scenario === 'normal-commit-fails' && patches >= 1)) { status = 500; response = {} } else { const sha = (++count).toString(16).padStart(40, '0'); commits.set(sha, { tree: { sha: body.tree }, parents: body.parents }); response = { sha }; if (scenario.startsWith('barrier') && patches === 1 && !blockedOnce) { blockedOnce = true; signalBarrier(); await barrier } } }
    else if (req.method === 'PATCH' && p === '/git/refs/heads/output') { patches++; if (scenario === 'ref-fails' || (scenario === 'normal-ref-fails' && patches > 1) || commits.get(body.sha)?.parents?.[0] !== head) { status = 422; response = {} } else { head = body.sha; if (scenario === 'ambiguous' || (scenario === 'normal-ambiguous' && patches === 2)) { res.destroy(); return } response = { object: { sha: head } } } }
    else { status = 404; response = { path: p } }
    res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(response))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const port = server.address().port
    const run = (script = 'initialize-fake-http.mjs', mode) => new Promise(resolve => { const child = spawn(process.execPath, [`scripts/${script}`, `http://127.0.0.1:${port}`, config, ...(mode ? [mode] : [])], { cwd: process.cwd() }); let stdout = '', stderr = ''; child.stdout.on('data', x => { stdout += x }); child.stderr.on('data', x => { stderr += x }); child.on('close', code => resolve({ code, stdout, stderr })) })
    const first = await run(), second = scenario === 'duplicate' ? await run() : null
    let english, translations, afterEnglish, beforeEnglish
    if (scenario.startsWith('barrier') && first.code === 0) {
      accepted = 'd'.repeat(40)
      const firstPerks = scenario === 'barrier-structure' ? { ...source.perks, 500: { hash: 500, aliasOf: 600, aliasKind: 'frame' } } : { ...source.perks, 300: perk(300, 'Translation A') }
      sourceBytes = Buffer.from(JSON.stringify({ perks: firstPerks })); sourceBlob = gitBlob(sourceBytes)
      const firstMode = ['barrier-en-en', 'barrier-en-tr'].includes(scenario) ? 'english' : 'translations'
      const secondMode = ['barrier-en-tr', 'barrier-tr-tr'].includes(scenario) ? 'translations' : 'english'
      const pendingTranslation = run('publish-fake-http.mjs', firstMode)
      await barrierSeen
      accepted = 'f'.repeat(40)
      const secondPerks = scenario === 'barrier-structure' ? { ...source.perks, 500: { hash: 500, aliasOf: 700, aliasKind: 'frame' }, 300: perk(300, 'English B') } : { ...source.perks, 300: perk(300, 'English B') }
      sourceBytes = Buffer.from(JSON.stringify({ perks: secondPerks })); sourceBlob = gitBlob(sourceBytes)
      english = await run('publish-fake-http.mjs', secondMode)
      afterEnglish = trees.get(commits.get(head).tree.sha)
      releaseBarrier()
      translations = await pendingTranslation
    }
    if (['unchanged', 'admin-only', 'manifest-changed', 'manifest-fails'].includes(scenario) && first.code === 0) {
      accepted = 'd'.repeat(40)
      if (scenario === 'admin-only') { sourceBytes = Buffer.from(JSON.stringify({ perks: { ...source.perks, 300: { ...source.perks[300], requestId: 'different' } } })); sourceBlob = gitBlob(sourceBytes) }
      translations = await run('publish-fake-http.mjs', 'translations')
    }
    if (scenario === 'tampered-state' && first.code === 0) {
      const priorTree = trees.get(commits.get(head).tree.sha), currentState = priorTree.find(x => x.path === '.publication-state.json')
      const parsed = JSON.parse(blobs.get(currentState.sha).toString()); parsed.components['300'].sourceCommit = 'e'.repeat(40)
      const corruptTree = '9'.repeat(40); trees.set(corruptTree, priorTree.map(x => x.path === '.publication-state.json' ? { ...x, sha: put(Buffer.from(JSON.stringify(parsed))) } : x))
      head = '8'.repeat(40); commits.set(head, { tree: { sha: corruptTree } }); beforeEnglish = trees.get(corruptTree)
      english = await run('publish-fake-http.mjs', 'english')
    }
    if (['vertical', 'structure', 'reverse', 'normal-ref-fails', 'normal-blob-fails', 'normal-tree-fails', 'normal-commit-fails', 'normal-ambiguous', 'collision', 'diverged', 'split', 'merge', 'removal', 'imports', 'globals'].includes(scenario) && first.code === 0) {
      beforeEnglish = trees.get(commits.get(head).tree.sha)
      accepted = 'd'.repeat(40)
      const perks = ['structure', 'collision'].includes(scenario) ? { ...source.perks, 500: { hash: 500, aliasOf: 600, aliasKind: 'frame' }, 700: perk(700, 'Independent changed') } : scenario === 'split' ? { ...source.perks, 500: perk(500, 'Split') } : scenario === 'merge' ? { ...source.perks, 600: { hash: 600, aliasOf: 300, aliasKind: 'frame' } } : scenario === 'removal' ? Object.fromEntries(Object.entries(source.perks).filter(([id]) => id !== '500')) : scenario === 'imports' ? { ...source.perks, 300: perk(300, 'import main from 700') } : scenario === 'globals' ? { ...baseSource.perks, 1: both(1, 'export nested (\nimport main from 700\n)') } : { ...source.perks, 300: perk(300, 'New English') }
      sourceBytes = Buffer.from(JSON.stringify({ perks })); sourceBlob = gitBlob(sourceBytes)
      if (scenario === 'reverse') {
        translations = await run('publish-fake-http.mjs', 'translations')
        if (translations.code === 0) english = await run('publish-fake-http.mjs', 'english')
        afterEnglish = trees.get(commits.get(head).tree.sha)
      } else {
        english = await run('publish-fake-http.mjs', 'english')
        afterEnglish = trees.get(commits.get(head).tree.sha)
        if (scenario === 'collision' && english.code === 0) {
          accepted = 'f'.repeat(40)
          english = await run('publish-fake-http.mjs', 'english')
          afterEnglish = trees.get(commits.get(head).tree.sha)
        }
        if (english.code === 0) translations = await run('publish-fake-http.mjs', 'translations')
      }
    }
    return { first, second, english, translations, beforeEnglish, afterEnglish, head, patches, inventoryReads, tree: trees.get(commits.get(head)?.tree.sha), blobs }
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
  assert.deepEqual(JSON.parse(r.english.stdout).convertedLanguages, ['en'])
  assert.ok(JSON.parse(r.translations.stdout).convertedLanguages.includes('de'))
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
test('split, canonical-to-stub merge and removal retain prior English topology until translations', async () => {
  for (const scenario of ['split', 'merge', 'removal']) {
    const r = await exercise(scenario); assert.equal(r.english.code, 0, `${scenario}: ${r.english.stderr}`); assert.equal(r.translations.code, 0, `${scenario}: ${r.translations.stderr}`)
    const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
    const old = read(r.beforeEnglish, 'descriptions/clarityV2.json'), interim = read(r.afterEnglish, 'descriptions/clarityV2.json'), final = read(r.tree, 'descriptions/clarityV2.json')
    const id = scenario === 'merge' ? '600' : '500'
    assert.deepEqual(interim[id], old[id], scenario)
    if (scenario === 'removal') assert.equal(final[id], undefined)
    if (scenario === 'merge') assert.equal(final[id].aliasOf, 300)
    if (scenario === 'split') assert.ok(final[id].descriptions.en && final[id].descriptions.de)
    assert.deepEqual(read(r.tree, '.publication-state.json').pending, [])
  }
})
test('import-only retarget queues old and new dependency closure in fake Git', async () => {
  const r = await exercise('imports'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const queued = read(r.afterEnglish, '.publication-state.json').pending
  assert.ok(queued.some(q => ['300', '500', '600', '700'].every(id => q.members.includes(id))))
  assert.deepEqual(read(r.beforeEnglish, 'descriptions/clarity.json')['300'], read(r.afterEnglish, 'descriptions/clarity.json')['300'])
  assert.notDeepEqual(read(r.tree, 'descriptions/clarity.json')['300'], read(r.afterEnglish, 'descriptions/clarity.json')['300'])
})
test('nested global import retarget queues dependent components', async () => {
  const r = await exercise('globals'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  const state = JSON.parse(r.blobs.get(r.afterEnglish.find(x => x.path === '.publication-state.json').sha).toString())
  assert.ok(state.pending.some(q => ['1', '300', '500', '600', '700'].every(id => q.members.includes(id))))
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
  assert.equal(JSON.parse(r.translations.stdout).result, 'unchanged'); assert.deepEqual(JSON.parse(r.translations.stdout).convertedLanguages, []); assert.equal(r.patches, 1); assert.equal(r.inventoryReads, 0)
})
test('unconsumed administrative change skips inventory and output writes', async () => {
  const r = await exercise('admin-only'); assert.equal(r.translations.code, 0, r.translations.stderr)
  assert.equal(JSON.parse(r.translations.stdout).result, 'unchanged'); assert.equal(r.patches, 1); assert.equal(r.inventoryReads, 0)
})
test('manifest identity change forces a build and updates provenance', async () => {
  const r = await exercise('manifest-changed'); assert.equal(r.translations.code, 0, r.translations.stderr); assert.equal(r.patches, 2); assert.equal(r.inventoryReads, 1)
  const state = JSON.parse(r.blobs.get(r.tree.find(x => x.path === '.publication-state.json').sha).toString())
  assert.equal(state.manifest.version, '2')
  const versions = JSON.parse(r.blobs.get(r.tree.find(x => x.path === 'versions.json').sha).toString())
  assert.equal(versions.descriptions, 2.0626)
})
test('manifest identity failure never becomes an unchanged success', async () => {
  const r = await exercise('manifest-fails'); assert.notEqual(r.translations.code, 0); assert.match(r.translations.stderr, /Invalid Bungie manifest identity/)
  assert.equal(r.patches, 1); assert.equal(r.inventoryReads, 0)
})
test('identical blobs at different commits retain queued component provenance', async () => {
  const r = await exercise('collision'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const pending = read(r.afterEnglish, '.publication-state.json')
  assert.equal(pending.components[500].sourceCommit, acceptedHead)
  assert.equal(pending.components[700].sourceCommit, 'f'.repeat(40))
  assert.equal(pending.pending[0].sourceCommit, 'f'.repeat(40))
  assert.equal(read(r.tree, 'descriptions/clarityV2.json')[500].aliasOf, 600)
  assert.deepEqual(read(r.tree, '.publication-state.json').pending, [])
})
test('normal publication ref contention exhausts retries without changing published tree', async () => {
  const r = await exercise('normal-ref-fails'); assert.notEqual(r.english.code, 0); assert.match(r.english.stderr, /retry limit exhausted/)
  assert.equal(r.patches, 4); assert.deepEqual(r.tree, r.beforeEnglish)
})
test('incremental blob, tree and commit failures leave previous output and state intact', async () => {
  for (const scenario of ['normal-blob-fails', 'normal-tree-fails', 'normal-commit-fails']) {
    const r = await exercise(scenario); assert.notEqual(r.english.code, 0, scenario); assert.equal(r.patches, 1, scenario); assert.deepEqual(r.tree, r.beforeEnglish, scenario)
  }
})
test('ambiguous incremental ref success is reconciled without duplicate English commit', async () => {
  const r = await exercise('normal-ambiguous'); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  assert.equal(r.patches, 3)
  const versions = JSON.parse(r.blobs.get(r.tree.find(x => x.path === 'versions.json').sha).toString())
  assert.equal(versions.descriptions, 2.0628)
})
test('divergent accepted history is rejected without a normal publication', async () => {
  const r = await exercise('diverged'); assert.notEqual(r.english.code, 0); assert.match(r.english.stderr, /Stale or divergent/)
  assert.equal(r.patches, 1); assert.deepEqual(r.tree, r.beforeEnglish)
})
test('tampered component source provenance fails recovery before normal output writes', async () => {
  const r = await exercise('tampered-state'); assert.notEqual(r.english.code, 0); assert.match(r.english.stderr, /recovery-required/)
  assert.equal(r.patches, 1); assert.deepEqual(r.tree, r.beforeEnglish)
})
test('staged translation retries after newer English wins the Git ref race', async () => {
  const r = await exercise('barrier'); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const english = read(r.afterEnglish, 'descriptions/clarity.json')['300'].descriptions.en
  const final = read(r.tree, 'descriptions/clarity.json')['300'].descriptions.en
  assert.deepEqual(final, english); assert.ok(r.patches >= 4)
  for (const item of r.afterEnglish.filter(x => /^descriptions\/.+\.json$/.test(x.path))) {
    const before = read(r.afterEnglish, item.path), after = read(r.tree, item.path)
    for (const [id, row] of Object.entries(before)) {
      if (row.descriptions && after[id]?.descriptions) assert.deepEqual(after[id].descriptions.en, row.descriptions.en, `${item.path}/${id}`)
    }
  }
  assert.equal(read(r.tree, 'versions.json').descriptions, 2.0628)
})
test('barrier-controlled English and translation races preserve newest source', async () => {
  for (const scenario of ['barrier-en-en', 'barrier-en-tr', 'barrier-tr-tr', 'barrier-structure']) {
    const r = await exercise(scenario)
    assert.equal(r.english.code, 0, `${scenario}: ${r.english.stderr}`); assert.equal(r.translations.code, 0, `${scenario}: ${r.translations.stderr}`)
    const read = path => JSON.parse(r.blobs.get(r.tree.find(x => x.path === path).sha).toString())
    const state = read('.publication-state.json')
    assert.equal(state.accepted.commit, 'f'.repeat(40), scenario)
    assert.ok(r.patches >= 3, scenario)
    if (scenario !== 'barrier-tr-tr') assert.equal(state.components[300].english, 'f'.repeat(40), scenario)
    if (scenario !== 'barrier-en-en') assert.equal(state.components[300].translations, 'f'.repeat(40), scenario)
    if (scenario === 'barrier-structure') {
      const queued = JSON.parse(r.blobs.get(r.afterEnglish.find(x => x.path === '.publication-state.json').sha).toString())
      assert.ok(queued.pending.some(x => x.sourceCommit === 'f'.repeat(40) && x.members.includes('500')))
      assert.equal(read('descriptions/clarityV2.json')[500].aliasOf, 700)
      assert.deepEqual(state.pending, [])
    }
  }
})
test('conversion, changed source, blob and ref failures leave published head unchanged', async () => {
  for (const scenario of ['bad-conversion', 'source-moves', 'blob-fails', 'tree-fails', 'commit-fails', 'ref-fails']) { const r = await exercise(scenario); assert.notEqual(r.first.code, 0, scenario); assert.equal(r.head, outputHead, scenario) }
  const moved = await exercise('output-moves'); assert.notEqual(moved.first.code, 0); assert.equal(moved.head, 'e'.repeat(40)); assert.equal(moved.patches, 0)
})
test('ambiguous success reconciles and duplicate initialization cannot replace state', async () => {
  const ambiguous = await exercise('ambiguous'); assert.equal(ambiguous.first.code, 0, ambiguous.first.stderr); assert.equal(ambiguous.patches, 1)
  const duplicate = await exercise('duplicate'); assert.equal(duplicate.first.code, 0, duplicate.first.stderr); assert.equal(duplicate.second.code, 0, duplicate.second.stderr); assert.equal(JSON.parse(duplicate.second.stdout).result, 'already-initialized-fake'); assert.equal(duplicate.patches, 1)
})
