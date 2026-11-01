import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { converterSettings } from '@icemourne/description-converter'
import { databaseConverter } from '../index.js'

const perk = (hash, text, extra = {}) => ({
  hash, name: `Perk ${hash}`, type: 'Weapon Perk', uploadedBy: 'tester',
  updateTracker: { descriptions: {} }, editor: { en: { main: text, secondary: text } },
  lastUpload: 1, inLiveDatabase: true, uploadToLive: true, ...extra
})
const globals = { 1: perk(1, ''), 2: perk(2, ''), 3: perk(3, '') }
const input = {
  ...globals, 300: perk(300, 'Canonical text', { associated: [900, 800] }),
  400: { hash: 400, aliasOf: 300, aliasKind: 'sandbox' },
  500: { hash: 500, aliasOf: 300, aliasKind: 'frame' },
  800: perk(800, 'Second target'), 900: perk(900, 'First target')
}

test('package-import publisher preserves legacy copies, ordered associations and exact v2 references', () => {
  for (const preset of Object.keys(converterSettings)) {
    const output = databaseConverter(preset, input, {})
    if (preset === 'clarityV2') {
      assert.deepEqual(output[300].associated, [900, 800])
      assert.deepEqual(output[400], { hash: 400, aliasOf: 300 })
      assert.deepEqual(output[500], { hash: 500, aliasOf: 300 })
    } else {
      assert.equal(output[400], undefined)
      assert.equal('associated' in output[300], false)
      assert.deepEqual(output[500].descriptions, output[300].descriptions)
    }
  }
})

test('package-import preflight rejects broken aliases, globals, imports and associations', () => {
  assert.throws(() => databaseConverter('clarityV2', { ...input, 600: { hash: 600, aliasOf: 999, aliasKind: 'frame' } }, {}), /Invalid alias/)
  const missing = { ...input }
  delete missing[3]
  assert.throws(() => databaseConverter('clarityV2', missing, {}), /reserved global 3/)
  assert.throws(() => databaseConverter('clarityV2', { ...input, 600: perk(600, 'import main from 999') }, {}), /Missing import/)
  assert.throws(() => databaseConverter('clarityV2', { ...input, 300: perk(300, 'Text', { associated: [999] }) }, {}), /Invalid association/)
  assert.throws(() => databaseConverter('clarityV2', { ...input, 800: perk(800, '') }, {}), /canonical target was filtered out/)
})

const prototypeNames = Object.getOwnPropertyNames(Object.prototype)
const exportInput = (from, name, payload) => {
  const database = {
    ...globals, 300: perk(300, 'Target'),
    600: perk(600, `Before\nimport ${name} from ${from}\nAfter`)
  }
  if (payload !== undefined) {
    const sourceHash = from === 'global' ? 1 : 300
    database[sourceHash] = perk(sourceHash, `export ${name} (\n${payload}\n)`)
  }
  return database
}

test('package-import publisher rejects absent prototype-named exports in both scopes across all eight outputs', () => {
  for (const from of ['global', '300']) {
    for (const name of prototypeNames) {
      const message = from === 'global'
        ? `Missing global export ${name} for 600/en`
        : `Missing export ${name} from ${from} for 600/en`
      for (const preset of Object.keys(converterSettings)) {
        assert.throws(() => databaseConverter(preset, exportInput(from, name), {}), { message }, `${preset}/${from}/${name}`)
      }
    }
  }
})

test('package-import publisher preserves explicitly authored and empty prototype-named exports', () => {
  for (const from of ['global', '300']) {
    for (const name of prototypeNames) {
      for (const payload of [`PAYLOAD_${name} $&`, '']) {
        for (const preset of Object.keys(converterSettings)) {
          const text = JSON.stringify(databaseConverter(preset, exportInput(from, name, payload), {})[600].descriptions)
          assert.ok(text.includes('Before') && text.includes('After'))
          if (payload) assert.ok(text.includes(payload), `${preset}/${from}/${name}`)
          assert.doesNotMatch(text, /import |native code/)
        }
      }
    }
  }
})

const runCli = (database, env, verify) => {
  const dir = mkdtempSync(join(tmpdir(), 'publisher-adoption-'))
  try {
    writeFileSync(join(dir, 'liveDescriptions.json'), JSON.stringify({ perks: database, databaseSettings: { reviewMarker: true } }))
    writeFileSync(join(dir, 'inventory.json'), '{}')
    writeFileSync(join(dir, 'versions-input.json'), '{"descriptions":2.0625}')
    const run = spawnSync(process.execPath, [
      '--import', new URL('./fixtures/register.mjs', import.meta.url).href,
      fileURLToPath(new URL('../index.js', import.meta.url))
    ], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } })
    verify(run, dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('actual CLI/companion write all eight package outputs and advance the pinned version', () => {
  runCli(input, {}, (run, dir) => {
    assert.equal(run.status, 0, run.stderr)
    assert.match(run.stdout, /Completed/)
    for (const preset of Object.keys(converterSettings)) {
      const output = JSON.parse(readFileSync(join(dir, 'database', 'descriptions', `${preset}.json`), 'utf8'))
      assert.deepEqual(output, databaseConverter(preset, input, {}))
    }
    assert.equal(JSON.parse(readFileSync(join(dir, 'database', 'versions.json'), 'utf8')).descriptions, 2.0626)
  })
})

test('actual CLI rejects absent prototype-named exports before creating any outputs or advancing versions', () => {
  for (const from of ['global', '300']) {
    for (const name of prototypeNames) {
      runCli(exportInput(from, name), {}, (run, dir) => {
        assert.notEqual(run.status, 0, `${from}/${name}`)
        const message = from === 'global'
          ? `Missing global export ${name} for 600/en`
          : `Missing export ${name} from ${from} for 600/en`
        assert.ok(run.stderr.includes(message), run.stderr)
        assert.equal(existsSync(join(dir, 'database')), false)
        assert.equal(readFileSync(join(dir, 'versions-input.json'), 'utf8'), '{"descriptions":2.0625}')
        assert.doesNotMatch(run.stdout, /Completed/)
      })
    }
  }
})

test('actual CLI publishes authored prototype-named exports to all eight outputs', () => {
  for (const from of ['global', '300']) {
    const definitions = prototypeNames.map(name => `export ${name} (\n${name === '__proto__' ? '' : `PAYLOAD_${name} $&`}\n)`).join('\n')
    const database = {
      ...globals,
      300: perk(300, 'Target'),
      600: perk(600, `Before\n${prototypeNames.map(name => `import ${name} from ${from}`).join('\n')}\nAfter`)
    }
    const sourceHash = from === 'global' ? 1 : 300
    database[sourceHash] = perk(sourceHash, definitions)
    runCli(database, {}, (run, dir) => {
      assert.equal(run.status, 0, run.stderr)
      for (const preset of Object.keys(converterSettings)) {
        const output = JSON.parse(readFileSync(join(dir, 'database', 'descriptions', `${preset}.json`), 'utf8'))
        assert.deepEqual(output, databaseConverter(preset, database, {}))
        const text = JSON.stringify(output[600].descriptions)
        for (const name of prototypeNames.filter(name => name !== '__proto__')) assert.ok(text.includes(`PAYLOAD_${name} $&`))
        assert.doesNotMatch(text, /import |native code/)
      }
      assert.equal(JSON.parse(readFileSync(join(dir, 'database', 'versions.json'), 'utf8')).descriptions, 2.0626)
    })
  }
})

test('manifest and version failures propagate before any output directory is created', () => {
  for (const failure of ['MANIFEST', 'VERSION']) {
    runCli(input, { [`ADOPTION_${failure}_FAIL`]: '1' }, (run, dir) => {
      assert.notEqual(run.status, 0)
      assert.match(run.stderr, new RegExp(`ADOPTION_${failure}_FAILURE`))
      assert.equal(existsSync(join(dir, 'database')), false)
    })
  }
})

test('late clarityV2 association failure does not write earlier legacy presets', () => {
  runCli({ ...input, 800: perk(800, '') }, {}, (run, dir) => {
    assert.notEqual(run.status, 0)
    assert.match(run.stderr, /canonical target was filtered out/)
    assert.equal(existsSync(join(dir, 'database')), false)
  })
})
