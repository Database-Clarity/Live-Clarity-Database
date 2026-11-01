import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulateInitialization } from '../scripts/initialize-simulator.mjs'
const a = 'a'.repeat(40), b = 'b'.repeat(40)
const plan = { acceptedCommit: a, parent: b, state: { initialized: true }, files: { 'versions.json': '{}' } }
test('initialization simulator refuses moved pins and a second initializer', () => {
  const options = { plan, currentAccepted: a, currentOutput: b, existingState: null }
  assert.equal(simulateInitialization(options).result, 'simulated')
  for (const race of ['source-before-promotion', 'output-before-promotion']) assert.throws(() => simulateInitialization({ ...options, race }), /pins moved/)
  assert.throws(() => simulateInitialization({ ...options, existingState: {} }), /already initialized/)
})
