import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { convertPresets } from '../index.js'
import { customJsonStringify } from '@icemourne/tool-box'
const p = (hash, text) => ({ hash, name: `Perk ${hash}`, type: 'Weapon Perk', uploadedBy: 'tester', updateTracker: { descriptions: {} }, editor: { en: { main: text, secondary: text }, de: { main: `DE ${text}`, secondary: `DE ${text}` } }, lastUpload: 1, inLiveDatabase: true, uploadToLive: true })
const input = { 1: p(1,''), 2: p(2,''), 3: p(3,''), 300: p(300,'Canonical text'), 500: { hash: 500, aliasOf: 300, aliasKind: 'frame' } }
const expected = { clarity: 'ee5757d716fb5c16af339e7840978247470856ee3c86fce48746979815fbb18b', dim: '4fa693fcb397974ef09dc8ec62f05a2140e5c36d0a35e9ce2fde1a2630388f44', crayon: '984fb8b8fac8840d8d19f89dc5f273eaddbd152ac538adfa2da8ed03c65fe807', foundry: 'ee5757d716fb5c16af339e7840978247470856ee3c86fce48746979815fbb18b', lightGG: '7ac5b84cc784635df3d3fe7055ac9de743dc9394520a99430fb591831f3b1901', braytech: '984fb8b8fac8840d8d19f89dc5f273eaddbd152ac538adfa2da8ed03c65fe807', vaultZero: 'fae9fc6eb8dca3569351295a6f0d87abef6151c2b923e115bc49038760fb3169', clarityV2: '9f984b58b40154bfb180bcd71a5d84d6f856ccba6947031283866b3cc410d274' }
test('pinned fixture serializes all eight preset formats consistently', () => {
  const outputs = convertPresets(input, {}, undefined, 'translations')
  assert.deepEqual(Object.keys(outputs).sort(), Object.keys(expected).sort())
  for (const [name, value] of Object.entries(outputs)) {
    const bytes = customJsonStringify(value, ['stat', 'multiplier', 'weaponTypes', 'classNames'])
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected[name], name)
  }
  assert.equal(outputs.vaultZero['300'].descriptions.de, undefined)
})
