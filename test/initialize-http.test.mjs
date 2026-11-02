import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planInitialization } from '../scripts/initialize-offline.mjs'
import { canonical, digest } from '../scripts/publish-preflight.mjs'
import { requiredFormats, inspectState, validateInitialized } from '../scripts/state-v2.mjs'
import { validateOutputReferences } from '@icemourne/description-converter'
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
const perk = (hash, text, extra = {}) => ({ hash, name: `Perk ${hash}`, type: 'Weapon Perk', uploadedBy: 'tester', updateTracker: { descriptions: { en: { lastUpdate: 1, updatedBy: 'editor' }, de: { lastUpdate: 2, updatedBy: 'translator', sourceUpdatedAt: 1 } } }, editor: { en: { main: text, secondary: text }, de: { main: `DE ${text}`, secondary: `DE ${text}` } }, lastUpload: 1, inLiveDatabase: true, uploadToLive: true, ...extra })
const both = (hash, text) => perk(hash, text, { editor: { en: { main: text, secondary: text }, de: { main: text, secondary: text } } })
const source = { perks: { 1: perk(1, ''), 2: perk(2, ''), 3: perk(3, ''), 300: perk(300, 'English'), 500: { hash: 500, aliasOf: 300, aliasKind: 'frame' }, 600: perk(600, 'Other'), 700: perk(700, 'Independent') } }
const outputHead = 'a'.repeat(40), acceptedHead = 'b'.repeat(40), treeHead = 'c'.repeat(40)
async function exercise(scenario) {
  const dir = mkdtempSync(join(tmpdir(), 'split-http-'))
  const inv = join(dir, 'inventory.json'), config = join(dir, 'config.json')
  const inventory = scenario === 'bungie-filtered' ? JSON.stringify({ 300: { displayProperties: { description: 'Bungie identical' } } }) : '{}'
  writeFileSync(inv, inventory); writeFileSync(config, JSON.stringify({ inventoryPath: inv, manifestVersion: '1', manifestPath: '/pinned.json', fixtureManifestHttp: true, traceConversions: true }))
  let accepted = acceptedHead, head = outputHead, count = 0, refReads = 0, outputReads = 0, patches = 0, inventoryReads = 0, draftReads = 0
  let releaseBarrier, signalBarrier
  const barrier = new Promise(resolve => { releaseBarrier = resolve }), barrierSeen = new Promise(resolve => { signalBarrier = resolve })
  let blockedOnce = false
  const blobs = new Map(), trees = new Map(), commits = new Map([[outputHead, { tree: { sha: treeHead } }]])
  const put = bytes => { const sha = gitBlob(bytes); blobs.set(sha, bytes); return sha }
  const entries = [{ path: 'versions.json', type: 'blob', sha: put(Buffer.from('{"descriptions":2.0625}')) }, ...['clarity', 'dim', 'crayon', 'foundry', 'lightGG', 'braytech', 'vaultZero'].map(name => ({ path: `descriptions/${name}.json`, type: 'blob', sha: put(Buffer.from('{}')) })), { path: 'README.md', type: 'blob', sha: put(Buffer.from('preserved')) }]
  trees.set(treeHead, entries)
  commits.set('e'.repeat(40), { tree: { sha: treeHead } })
  const baseSource = scenario === 'imports' ? { perks: { ...source.perks, 300: perk(300, 'import main from 600') } } : scenario === 'globals' ? { perks: { ...source.perks, 1: both(1, 'export nested (\nimport main from 600\n)'), 300: both(300, 'import nested from global') } } : source
  let sourceBytes = Buffer.from(JSON.stringify(scenario === 'bad-conversion' ? { perks: { 1: perk(1, ''), 2: perk(2, ''), 3: perk(3, ''), 300: perk(300, 'import main from 999') } } : baseSource)), sourceBlob = gitBlob(sourceBytes)
  const historicalSourceBytes = Buffer.from(sourceBytes), historicalSourceBlob = sourceBlob
  const bundle = join(dir, 'bundle.json')
  if (['import', 'import-invalid', 'import-ahead', 'import-ambiguous', 'import-source-moves', 'import-output-moves'].includes(scenario)) {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519'), manifestBytes = Buffer.from('{}'), hash = 'f'.repeat(64)
    const legacy = Object.fromEntries(requiredFormats.filter(x => x !== 'clarityV2').map(x => [`descriptions/${x}.json`, '{}']))
    const converted = Object.fromEntries(requiredFormats.map(x => [`descriptions/${x}.json`, '{}']))
    const init = planInitialization({ accepted: { repository: 'fixture/accepted', ref: 'accepted', commit: acceptedHead, blob: sourceBlob, bytes: sourceBytes, input: baseSource }, output: { commit: outputHead, tree: treeHead, files: legacy, versions: { descriptions: 2.0625 }, versionBytes: '{"descriptions":2.0625}', state: null }, publisher: { identity: hash, lock: hash, converter: acceptedHead, runtime: 'node20', toolbox: '1.0.43' }, manifest: { version: 'v1', path: '/v1', digest: digest(manifestBytes), bytes: manifestBytes }, languages: ['en', 'de'], converted, fingerprint: hash, validateOutput: () => {} })
    const candidate = structuredClone(init.state); candidate.baseline.kind = 'verified-import'; candidate.inventory.formats = candidate.inventory.formats.filter(x => x !== 'clarityV2'); candidate.outputDigests = structuredClone(candidate.baseline.outputDigests); candidate.translationFingerprint = null
    const data = { executionRecord: Buffer.from(canonical({ runId: 'fixture-run', accepted: candidate.accepted, outputCommit: candidate.baseline.outputCommit, outputTree: candidate.baseline.outputTree, publisher: candidate.publisher, manifest: candidate.manifest })), dependencies: Buffer.from(canonical(candidate.publisher)), manifest: manifestBytes, graphProof: Buffer.from(canonical(candidate.graph)), legacyMapping: Buffer.from(JSON.stringify({ formats: Object.fromEntries(candidate.inventory.formats.map(x => [x, `descriptions/${x}.json`])), ownership: Object.fromEntries(Object.keys(candidate.components).map(x => [x, String(candidate.graph[x]?.aliasOf ?? x)])) })), outputProof: Buffer.from(canonical({ ...legacy, 'versions.json': '{"descriptions":2.0625}' })) }
    const artifacts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.toString('base64')]))
    const evidence = { executionRecordDigest: digest(data.executionRecord), dependenciesDigest: digest(data.dependencies), manifestBytesDigest: digest(data.manifest), graphProofDigest: digest(data.graphProof), legacyMappingDigest: digest(data.legacyMapping), outputProofDigest: digest(data.outputProof) }
    candidate.baseline.proof = { evidenceDigest: digest(canonical(evidence)), keyFingerprint: digest(publicKey.export({ type: 'spki', format: 'der' })) }
    evidence.signature = sign(null, Buffer.from(canonical({ candidate, evidence })), privateKey).toString('base64')
    if (scenario === 'import-invalid') evidence.signature = Buffer.alloc(64).toString('base64')
    writeFileSync(bundle, JSON.stringify({ candidate, artifacts, evidence, trustedPublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString() }))
    if (scenario === 'import-ahead') { accepted = 'd'.repeat(40); sourceBytes = Buffer.from(JSON.stringify({ perks: { ...source.perks, 500: { hash: 500, aliasOf: 600, aliasKind: 'frame' } } })); sourceBlob = gitBlob(sourceBytes) }
  }
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk; const body = raw ? JSON.parse(raw) : null; const p = req.url; let response, status = 200
    if (p === '/git/ref/heads/accepted') { refReads++; if (scenario === 'source-moves' && refReads === 2) accepted = 'd'.repeat(40); response = { object: { sha: accepted } } }
    else if (p === '/git/ref/heads/output') { outputReads++; if (scenario === 'output-moves' && outputReads === 2) head = 'e'.repeat(40); response = { object: { sha: head } } }
    else if (p.startsWith('/contents/liveDescriptions.json?ref=')) {
      if (p.endsWith('7'.repeat(40))) { draftReads++; const draft = Buffer.from(JSON.stringify({ perks: { ...source.perks, 300: perk(300, 'UNACCEPTED DRAFT') } })); response = { encoding: 'base64', sha: gitBlob(draft), content: draft.toString('base64') } }
      else if (scenario === 'import-ahead' && p.endsWith(acceptedHead)) response = { encoding: 'base64', sha: historicalSourceBlob, content: historicalSourceBytes.toString('base64') }
      else response = { encoding: 'base64', sha: sourceBlob, content: sourceBytes.toString('base64') }
    }
    else if (p.startsWith('/compare/')) response = { status: scenario === 'diverged' ? 'diverged' : 'ahead' }
    else if (p === '/fixture/manifest') response = scenario === 'manifest-fails' ? {} : { Response: { version: scenario === 'manifest-changed' ? '2' : '1', jsonWorldComponentContentPaths: { en: { DestinyInventoryItemDefinition: scenario === 'manifest-path' ? '/other-pinned.json' : '/pinned.json' } } } }
    else if (p.startsWith('/fixture/inventory?')) { inventoryReads++; response = { path: new URL(p, 'http://localhost').searchParams.get('path'), content: Buffer.from(inventory).toString('base64') } }
    else if (req.method === 'GET' && p.startsWith('/git/commits/')) response = commits.get(p.split('/').at(-1))
    else if (req.method === 'GET' && p.startsWith('/git/trees/')) response = { tree: trees.get(p.split('/').at(-1).split('?')[0]), truncated: false }
    else if (req.method === 'GET' && p.startsWith('/git/blobs/')) response = { encoding: 'base64', content: blobs.get(p.split('/').at(-1)).toString('base64') }
    else if (req.method === 'POST' && p === '/git/blobs') { if (scenario === 'blob-fails' || (scenario === 'normal-blob-fails' && patches >= 1)) { status = 500; response = {} } else response = { sha: put(Buffer.from(body.content, 'base64')) } }
    else if (req.method === 'POST' && p === '/git/trees') { if (scenario === 'tree-fails' || (scenario === 'normal-tree-fails' && patches >= 1)) { status = 500; response = {} } else { const sha = (++count).toString(16).padStart(40, '0'); trees.set(sha, [...trees.get(body.base_tree).filter(x => !body.tree.some(y => y.path === x.path)), ...body.tree.filter(y => y.sha !== null)]); response = { sha } } }
    else if (req.method === 'POST' && p === '/git/commits') { if (scenario === 'commit-fails' || (scenario === 'normal-commit-fails' && patches >= 1)) { status = 500; response = {} } else { const sha = (++count).toString(16).padStart(40, '0'); commits.set(sha, { tree: { sha: body.tree }, parents: body.parents }); response = { sha }; if (['initial-stage-source-moves', 'import-source-moves'].includes(scenario)) accepted = 'd'.repeat(40); if (['initial-stage-output-moves', 'import-output-moves'].includes(scenario)) head = 'e'.repeat(40); if (((scenario.startsWith('barrier') && patches === 1) || (scenario === 'init-barrier' && patches === 0)) && !blockedOnce) { blockedOnce = true; signalBarrier(); await barrier } } }
    else if (req.method === 'PATCH' && p === '/git/refs/heads/output') { patches++; if (scenario === 'ref-fails' || (scenario === 'normal-ref-fails' && patches > 1) || commits.get(body.sha)?.parents?.[0] !== head) { status = 422; response = {} } else { head = body.sha; if (scenario === 'ambiguous' || scenario === 'import-ambiguous' || (scenario === 'normal-ambiguous' && patches === 2)) { res.destroy(); return } response = { object: { sha: head } } } }
    else { status = 404; response = { path: p } }
    res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(response))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const port = server.address().port
    const run = (script = 'initialize-fake-http.mjs', mode, blockDependencies = false) => new Promise(resolve => { const child = spawn(process.execPath, [...(blockDependencies ? ['--import', './test/fixtures/block-dependencies-register.mjs'] : []), `scripts/${script}`, `http://127.0.0.1:${port}`, script === 'import-baseline-fake-http.mjs' ? bundle : config, ...(mode ? [mode] : [])], { cwd: process.cwd() }); let stdout = '', stderr = ''; child.stdout.on('data', x => { stdout += x }); child.stderr.on('data', x => { stderr += x }); child.on('close', code => resolve({ code, stdout, stderr })) })
    let first, second = null
    if (scenario === 'init-barrier') {
      const pending = run(); await barrierSeen; second = await run(); releaseBarrier(); first = await pending
    } else {
      first = scenario === 'normal-uninitialized' ? await run('publish-fake-http.mjs', 'english') : ['import', 'import-invalid', 'import-ahead', 'import-ambiguous', 'import-source-moves', 'import-output-moves'].includes(scenario) ? await run('import-baseline-fake-http.mjs') : await run()
      if (scenario === 'duplicate') second = await run()
    }
    let english, translations, repeatTranslation, rollback, recoveryRuns, afterEnglish, beforeEnglish
    if (scenario === 'rollback' && first.code === 0) {
      rollback = await run('rollback-fake-http.mjs')
      if (rollback.code === 0) english = await run('publish-fake-http.mjs', 'english')
    }
    if (scenario === 'import-ahead' && first.code === 0) {
      beforeEnglish = trees.get(commits.get(head).tree.sha)
      english = await run('publish-fake-http.mjs', 'english')
      afterEnglish = trees.get(commits.get(head).tree.sha)
    }
    if (scenario === 'coverage-recovery' && first.code === 0) {
      const step = async (commit, perks, mode) => {
        accepted = commit.repeat(40); sourceBytes = Buffer.from(JSON.stringify({ perks })); sourceBlob = gitBlob(sourceBytes)
        return run('publish-fake-http.mjs', mode)
      }
      const noGerman = { ...source.perks, 300: { ...source.perks[300], editor: { en: source.perks[300].editor.en } } }
      const splitMissing = { ...noGerman, 500: { ...perk(500, 'Split'), editor: { en: { main: 'Split', secondary: 'Split' } } } }
      const splitComplete = { ...source.perks, 500: perk(500, 'Split') }
      recoveryRuns = []
      recoveryRuns.push(await step('d', noGerman, 'english'), await step('d', noGerman, 'translations'))
      recoveryRuns.push(await step('e', splitMissing, 'english'), await step('e', splitMissing, 'translations'))
      recoveryRuns.push(await step('f', splitComplete, 'english'), await step('f', splitComplete, 'translations'))
    }
    if (scenario.startsWith('barrier') && first.code === 0) {
      accepted = 'd'.repeat(40)
      const firstPerks = scenario === 'barrier-structure' ? { ...source.perks, 500: { hash: 500, aliasOf: 600, aliasKind: 'frame' } } : { ...source.perks, 300: perk(300, 'Translation A') }
      sourceBytes = Buffer.from(JSON.stringify({ perks: firstPerks })); sourceBlob = gitBlob(sourceBytes)
      const firstMode = ['barrier-en-en', 'barrier-en-tr'].includes(scenario) ? 'english' : 'translations'
      const secondMode = ['barrier-en-tr', 'barrier-tr-tr'].includes(scenario) ? 'translations' : 'english'
      const pendingTranslation = run('publish-fake-http.mjs', firstMode)
      await barrierSeen
      if (scenario !== 'barrier-same-source') {
        accepted = 'f'.repeat(40)
        const secondPerks = scenario === 'barrier-structure' ? { ...source.perks, 500: { hash: 500, aliasOf: 700, aliasKind: 'frame' }, 300: perk(300, 'English B') } : { ...source.perks, 300: perk(300, 'English B') }
        sourceBytes = Buffer.from(JSON.stringify({ perks: secondPerks })); sourceBlob = gitBlob(sourceBytes)
      }
      if (scenario !== 'barrier-source-only') english = await run('publish-fake-http.mjs', secondMode)
      afterEnglish = trees.get(commits.get(head).tree.sha)
      releaseBarrier()
      translations = await pendingTranslation
    }
    if (['unchanged', 'admin-only', 'manifest-changed', 'manifest-path', 'manifest-fails'].includes(scenario) && first.code === 0) {
      accepted = 'd'.repeat(40)
      if (scenario === 'admin-only') { sourceBytes = Buffer.from(JSON.stringify({ perks: { ...source.perks, 300: { ...source.perks[300], requestId: 'different' } } })); sourceBlob = gitBlob(sourceBytes) }
      translations = await run('publish-fake-http.mjs', 'translations', scenario === 'unchanged')
    }
    if (scenario === 'tampered-state' && first.code === 0) {
      const priorTree = trees.get(commits.get(head).tree.sha), currentState = priorTree.find(x => x.path === '.publication-state.json')
      const parsed = JSON.parse(blobs.get(currentState.sha).toString()); parsed.components['300'].sourceCommit = 'e'.repeat(40)
      const corruptTree = '9'.repeat(40); trees.set(corruptTree, priorTree.map(x => x.path === '.publication-state.json' ? { ...x, sha: put(Buffer.from(JSON.stringify(parsed))) } : x))
      head = '8'.repeat(40); commits.set(head, { tree: { sha: corruptTree } }); beforeEnglish = trees.get(corruptTree)
      english = await run('publish-fake-http.mjs', 'english')
    }
    if (['vertical', 'draft', 'structure', 'reverse', 'normal-ref-fails', 'normal-blob-fails', 'normal-tree-fails', 'normal-commit-fails', 'normal-ambiguous', 'collision', 'diverged', 'split', 'split-missing', 'split-missing-tracker', 'merge', 'removal', 'imports', 'globals', 'language-removal', 'empty-english', 'bungie-filtered', 'queued-filtered-target'].includes(scenario) && first.code === 0) {
      beforeEnglish = trees.get(commits.get(head).tree.sha)
      accepted = 'd'.repeat(40)
      const perks = ['structure', 'collision'].includes(scenario) ? { ...source.perks, 500: { hash: 500, aliasOf: 600, aliasKind: 'frame' }, 700: perk(700, 'Independent changed') } : scenario === 'queued-filtered-target' ? { ...source.perks, 500: { hash: 500, aliasOf: 600, aliasKind: 'frame' }, 600: { ...source.perks[600], editor: { ...source.perks[600].editor, en: { main: '', secondary: '' } } }, 700: perk(700, 'Independent changed') } : scenario === 'split' ? { ...source.perks, 500: perk(500, 'Split') } : scenario === 'split-missing' ? { ...source.perks, 500: { ...perk(500, 'Split'), editor: { en: { main: 'Split', secondary: 'Split' } } } } : scenario === 'split-missing-tracker' ? { ...source.perks, 500: perk(500, 'Split', { updateTracker: { descriptions: { en: { lastUpdate: 1 } } } }) } : scenario === 'merge' ? { ...source.perks, 600: { hash: 600, aliasOf: 300, aliasKind: 'frame' } } : scenario === 'removal' ? Object.fromEntries(Object.entries(source.perks).filter(([id]) => id !== '500')) : scenario === 'imports' ? { ...source.perks, 300: perk(300, 'import main from 700') } : scenario === 'globals' ? { ...baseSource.perks, 1: both(1, 'export nested (\nimport main from 700\n)') } : scenario === 'language-removal' ? { ...source.perks, 300: { ...source.perks[300], editor: { en: source.perks[300].editor.en } } } : scenario === 'empty-english' ? { ...source.perks, 300: { ...source.perks[300], editor: { ...source.perks[300].editor, en: { main: '', secondary: '' } } } } : scenario === 'bungie-filtered' ? { ...source.perks, 300: { ...source.perks[300], editor: { ...source.perks[300].editor, en: { main: 'Bungie identical', secondary: 'Bungie identical' } } } } : { ...source.perks, 300: perk(300, 'New English') }
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
        if (scenario === 'language-removal' && translations?.code === 0) repeatTranslation = await run('publish-fake-http.mjs', 'translations')
      }
    }
    return { first, second, english, translations, repeatTranslation, rollback, recoveryRuns, beforeEnglish, afterEnglish, head, accepted, sourceBlob, patches, inventoryReads, draftReads, tree: trees.get(commits.get(head)?.tree.sha), blobs }
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }) }
}
test('executable initializes through actual converter and fake HTTP Git objects', async () => {
  const r = await exercise('success'); assert.equal(r.first.code, 0, r.first.stderr); assert.notEqual(r.head, outputHead); assert.equal(r.patches, 1)
  const read = path => JSON.parse(r.blobs.get(r.tree.find(x => x.path === path).sha).toString())
  assert.equal(read('versions.json').descriptions, 2.0626); assert.equal(read('.publication-state.json').initialized, true)
  assert.ok(read('descriptions/clarity.json')['300'].descriptions.de); assert.ok(read('descriptions/clarityV2.json')['500'].aliasOf)
  assert.equal(r.blobs.get(r.tree.find(x => x.path === 'README.md').sha).toString(), 'preserved')
})
test('normal fake publication never implicitly initializes missing state', async () => {
  const r = await exercise('normal-uninitialized'); assert.notEqual(r.first.code, 0); assert.match(r.first.stderr, /initialization-required/)
  assert.equal(r.head, outputHead); assert.equal(r.patches, 0)
})
test('fake rollback restores the legacy output as one commit and requires initialization again', async () => {
  const r = await exercise('rollback'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.rollback.code, 0, r.rollback.stderr)
  assert.equal(r.patches, 2); assert.equal(r.tree.some(x => x.path === '.publication-state.json'), false)
  assert.equal(r.tree.filter(x => x.path.startsWith('descriptions/')).length, 7)
  assert.equal(r.blobs.get(r.tree.find(x => x.path === 'versions.json').sha).toString(), '{"descriptions":2.0625}')
  assert.equal(r.blobs.get(r.tree.find(x => x.path === 'README.md').sha).toString(), 'preserved')
  assert.notEqual(r.english.code, 0); assert.match(r.english.stderr, /initialization-required/)
})
test('verified baseline import writes only state and preserves seven legacy outputs', async () => {
  const r = await exercise('import'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.patches, 1)
  const state = JSON.parse(r.blobs.get(r.tree.find(x => x.path === '.publication-state.json').sha).toString())
  assert.equal(state.baseline.kind, 'verified-import'); assert.equal(state.translationFingerprint, null)
  assert.equal(r.tree.filter(x => x.path.startsWith('descriptions/')).length, 7)
  assert.equal(r.tree.some(x => x.path === 'descriptions/clarityV2.json'), false)
  assert.equal(r.blobs.get(r.tree.find(x => x.path === 'versions.json').sha).toString(), '{"descriptions":2.0625}')
  const invalid = await exercise('import-invalid'); assert.notEqual(invalid.first.code, 0); assert.equal(invalid.patches, 0); assert.equal(invalid.head, outputHead)
})
test('verified historical baseline remains distinct from newer accepted structure', async () => {
  const r = await exercise('import-ahead'); assert.equal(r.first.code, 0, r.first.stderr); assert.equal(r.english.code, 0, r.english.stderr)
  const state = JSON.parse(r.blobs.get(r.beforeEnglish.find(x => x.path === '.publication-state.json').sha).toString())
  assert.equal(state.accepted.commit, acceptedHead); assert.equal(state.graph[500].aliasOf, 300)
  assert.deepEqual(state.pending, []); assert.equal(state.translationFingerprint, null)
  const outputs = Object.fromEntries(r.beforeEnglish.filter(x => /^descriptions\/.+\.json$/.test(x.path) || x.path === 'versions.json').map(x => [x.path, r.blobs.get(x.sha).toString()]))
  const status = inspectState(state, outputs, { repository: 'fixture/accepted', ref: 'accepted', commit: r.accepted, blob: r.sourceBlob }, r.head)
  assert.equal(status.pendingAcceptedWork, true); assert.equal(status.lastEvaluatedAcceptedSource.commit, acceptedHead)
  const next = JSON.parse(r.blobs.get(r.tree.find(x => x.path === '.publication-state.json').sha).toString())
  assert.equal(next.accepted.commit, 'd'.repeat(40)); assert.equal(next.graph[500].aliasOf, 300)
  assert.ok(next.pending.some(q => q.members.includes('500')))
  assert.equal(r.tree.some(x => x.path === 'descriptions/clarityV2.json'), false)
})
test('verified fixture import reconciles ambiguous success and aborts moved pins', async () => {
  const ambiguous = await exercise('import-ambiguous'); assert.equal(ambiguous.first.code, 0, ambiguous.first.stderr); assert.equal(ambiguous.patches, 1)
  const source = await exercise('import-source-moves'); assert.notEqual(source.first.code, 0); assert.equal(source.head, outputHead); assert.equal(source.patches, 0)
  const output = await exercise('import-output-moves'); assert.notEqual(output.first.code, 0); assert.equal(output.head, 'e'.repeat(40)); assert.equal(output.patches, 0)
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
test('both modes use accepted input and never read a newer unaccepted draft', async () => {
  const r = await exercise('draft'); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr); assert.equal(r.draftReads, 0)
  for (const item of r.tree.filter(x => /^descriptions\/.+\.json$/.test(x.path))) assert.doesNotMatch(r.blobs.get(item.sha).toString(), /UNACCEPTED DRAFT/, item.path)
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
test('structural promotion with missing translation fails and retains queued output', async () => {
  const r = await exercise('split-missing'); assert.equal(r.english.code, 0, r.english.stderr); assert.notEqual(r.translations.code, 0); assert.match(r.translations.stderr, /Structural translation missing/)
  assert.deepEqual(r.tree, r.afterEnglish); assert.equal(r.patches, 2)
})
test('structural promotion with missing translation tracker fails and retains queued output', async () => {
  const r = await exercise('split-missing-tracker'); assert.equal(r.english.code, 0, r.english.stderr); assert.notEqual(r.translations.code, 0); assert.match(r.translations.stderr, /Structural tracker missing/)
  assert.deepEqual(r.tree, r.afterEnglish); assert.equal(r.patches, 2)
})
test('queued filtered target does not block independent English publication', async () => {
  const r = await exercise('queued-filtered-target'); assert.equal(r.english.code, 0, r.english.stderr); assert.notEqual(r.translations.code, 0)
  const converted = JSON.parse(r.english.stdout).convertedComponents
  assert.ok(converted.includes('700')); assert.ok(!converted.includes('300') && !converted.includes('500') && !converted.includes('600'))
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const old = read(r.beforeEnglish, 'descriptions/clarityV2.json'), english = read(r.afterEnglish, 'descriptions/clarityV2.json')
  assert.equal(english[500].aliasOf, 300); assert.notDeepEqual(english[700].descriptions.en, old[700].descriptions.en)
  assert.ok(read(r.afterEnglish, '.publication-state.json').pending.some(q => q.members.includes('500')))
  assert.deepEqual(r.tree, r.afterEnglish)
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
test('missing accepted language retains the last published translation', async () => {
  const r = await exercise('language-removal'); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  const read = (tree, path) => JSON.parse(r.blobs.get(tree.find(x => x.path === path).sha).toString())
  const before = read(r.beforeEnglish, 'descriptions/clarity.json')['300'].descriptions.de
  const after = read(r.tree, 'descriptions/clarity.json')['300'].descriptions.de
  assert.deepEqual(after, before)
  const state = read(r.tree, '.publication-state.json')
  assert.equal(state.components[300].translations, acceptedHead)
  assert.match(state.translationFingerprint, /^[a-f0-9]{64}$/); assert.deepEqual(state.retainedLanguages['300'], ['de'])
  assert.equal(r.repeatTranslation.code, 0, r.repeatTranslation.stderr); assert.equal(JSON.parse(r.repeatTranslation.stdout).result, 'unchanged')
  for (const item of r.beforeEnglish.filter(x => /^descriptions\/.+\.json$/.test(x.path))) {
    const old = read(r.beforeEnglish, item.path)['300'], current = read(r.tree, item.path)['300']
    if (old?.updateTracker?.descriptions?.de) assert.deepEqual(current.updateTracker.descriptions.de, old.updateTracker.descriptions.de, item.path)
  }
})
test('English prefilters retain translated rows and trackers', async () => {
  for (const scenario of ['empty-english', 'bungie-filtered']) {
    const r = await exercise(scenario); assert.equal(r.english.code, 0, `${scenario}: ${r.english.stderr}`); assert.equal(r.translations.code, 0, `${scenario}: ${r.translations.stderr}`)
    const read = tree => JSON.parse(r.blobs.get(tree.find(x => x.path === 'descriptions/clarity.json').sha).toString())
    const before = read(r.beforeEnglish)['300'], interim = read(r.afterEnglish)['300'], final = read(r.tree)['300']
    assert.deepEqual(interim.descriptions.de, before.descriptions.de, scenario); assert.deepEqual(final.descriptions.de, before.descriptions.de, scenario)
    assert.equal(interim.descriptions.en, undefined, scenario)
  }
})
test('retained coverage survives queued failure and clears after a complete structural retry', async () => {
  const r = await exercise('coverage-recovery')
  for (const index of [0, 1, 2, 4, 5]) assert.equal(r.recoveryRuns[index].code, 0, `${index}: ${r.recoveryRuns[index].stderr}`)
  assert.notEqual(r.recoveryRuns[3].code, 0); assert.match(r.recoveryRuns[3].stderr, /Structural translation missing/)
  const state = JSON.parse(r.blobs.get(r.tree.find(x => x.path === '.publication-state.json').sha).toString())
  assert.deepEqual(state.pending, []); assert.deepEqual(state.retainedLanguages, {})
  assert.equal(state.components[300].translations, 'f'.repeat(40)); assert.equal(state.components[500].translations, 'f'.repeat(40))
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
test('manifest component path change forces inventory fetch at the pinned path', async () => {
  const r = await exercise('manifest-path'); assert.equal(r.translations.code, 0, r.translations.stderr); assert.equal(r.patches, 2); assert.equal(r.inventoryReads, 1)
  const state = JSON.parse(r.blobs.get(r.tree.find(x => x.path === '.publication-state.json').sha).toString())
  assert.equal(state.manifest.path, '/other-pinned.json'); assert.equal(state.manifest.digest, digest(Buffer.from('{}')))
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
  assert.deepEqual(final, english); assert.ok(r.patches >= 3)
  for (const item of r.afterEnglish.filter(x => /^descriptions\/.+\.json$/.test(x.path))) {
    const before = read(r.afterEnglish, item.path), after = read(r.tree, item.path)
    for (const [id, row] of Object.entries(before)) {
      if (row.descriptions && after[id]?.descriptions) assert.deepEqual(after[id].descriptions.en, row.descriptions.en, `${item.path}/${id}`)
    }
  }
  assert.equal(read(r.tree, 'versions.json').descriptions, 2.0628)
})
test('unchanged accepted source with a moved output triggers a real CAS retry', async () => {
  const r = await exercise('barrier-same-source'); assert.equal(r.english.code, 0, r.english.stderr); assert.equal(r.translations.code, 0, r.translations.stderr)
  assert.ok(r.patches >= 4)
  const state = JSON.parse(r.blobs.get(r.tree.find(x => x.path === '.publication-state.json').sha).toString())
  assert.equal(state.accepted.commit, 'd'.repeat(40))
})
test('accepted source movement during staging replans before any ref update', async () => {
  const r = await exercise('barrier-source-only'); assert.equal(r.translations.code, 0, r.translations.stderr); assert.equal(r.patches, 2)
  const state = JSON.parse(r.blobs.get(r.tree.find(x => x.path === '.publication-state.json').sha).toString())
  assert.equal(state.accepted.commit, 'f'.repeat(40))
})
test('barrier-controlled English and translation races preserve newest source', async () => {
  for (const scenario of ['barrier-en-en', 'barrier-en-tr', 'barrier-tr-tr', 'barrier-structure']) {
    const r = await exercise(scenario)
    assert.equal(r.english.code, 0, `${scenario}: ${r.english.stderr}`); assert.equal(r.translations.code, 0, `${scenario}: ${r.translations.stderr}`)
    const read = path => JSON.parse(r.blobs.get(r.tree.find(x => x.path === path).sha).toString())
    const state = read('.publication-state.json')
    assert.equal(state.accepted.commit, 'f'.repeat(40), scenario)
    assert.ok(r.patches >= 2, scenario)
    if (scenario !== 'barrier-tr-tr') assert.equal(state.components[300].english, 'f'.repeat(40), scenario)
    if (scenario !== 'barrier-en-en') assert.equal(state.components[300].translations, 'f'.repeat(40), scenario)
    for (const item of r.tree.filter(x => /^descriptions\/.+\.json$/.test(x.path))) {
      const row = read(item.path)['300']
      validateOutputReferences(read(item.path))
      assert.ok(row?.descriptions?.en, `${scenario}/${item.path}`)
      if (scenario !== 'barrier-tr-tr') assert.match(JSON.stringify(row.descriptions.en), /English B/, `${scenario}/${item.path}`)
      if (scenario !== 'barrier-en-en' && row.descriptions.de) assert.match(JSON.stringify(row.descriptions.de), /DE English B/, `${scenario}/${item.path}`)
    }
    const files = Object.fromEntries(r.tree.filter(x => /^descriptions\/.+\.json$/.test(x.path) || x.path === 'versions.json').map(x => [x.path, r.blobs.get(x.sha).toString()]))
    assert.doesNotThrow(() => validateInitialized(state, files), scenario)
    const beforeVersion = JSON.parse(r.blobs.get(r.afterEnglish.find(x => x.path === 'versions.json').sha).toString()).descriptions
    const finalVersion = read('versions.json').descriptions
    assert.ok(finalVersion === beforeVersion || Math.round((finalVersion - beforeVersion) * 10000) === 1, scenario)
    if (scenario === 'barrier-structure') {
      const queued = JSON.parse(r.blobs.get(r.afterEnglish.find(x => x.path === '.publication-state.json').sha).toString())
      assert.ok(queued.pending.some(x => x.sourceCommit === 'f'.repeat(40) && x.members.includes('500')))
      assert.equal(read('descriptions/clarityV2.json')[500].aliasOf, 700)
      assert.deepEqual(state.pending, [])
    }
  }
})
test('conversion, changed source, blob and ref failures leave published head unchanged', async () => {
  for (const scenario of ['bad-conversion', 'source-moves', 'initial-stage-source-moves', 'blob-fails', 'tree-fails', 'commit-fails', 'ref-fails']) { const r = await exercise(scenario); assert.notEqual(r.first.code, 0, scenario); assert.equal(r.head, outputHead, scenario) }
  const moved = await exercise('output-moves'); assert.notEqual(moved.first.code, 0); assert.equal(moved.head, 'e'.repeat(40)); assert.equal(moved.patches, 0)
  const staged = await exercise('initial-stage-output-moves'); assert.notEqual(staged.first.code, 0); assert.equal(staged.head, 'e'.repeat(40)); assert.equal(staged.patches, 0)
})
test('ambiguous success reconciles and duplicate initialization cannot replace state', async () => {
  const ambiguous = await exercise('ambiguous'); assert.equal(ambiguous.first.code, 0, ambiguous.first.stderr); assert.equal(ambiguous.patches, 1)
  const duplicate = await exercise('duplicate'); assert.equal(duplicate.first.code, 0, duplicate.first.stderr); assert.equal(duplicate.second.code, 0, duplicate.second.stderr); assert.equal(JSON.parse(duplicate.second.stdout).result, 'already-initialized-fake'); assert.equal(duplicate.patches, 1)
})
test('two simultaneous initializers cannot replace an established baseline', async () => {
  const r = await exercise('init-barrier'); assert.equal(r.second.code, 0, r.second.stderr); assert.notEqual(r.first.code, 0); assert.match(r.first.stderr, /Pins changed/)
  assert.equal(r.patches, 1)
  const versions = JSON.parse(r.blobs.get(r.tree.find(x => x.path === 'versions.json').sha).toString())
  assert.equal(versions.descriptions, 2.0626)
})
