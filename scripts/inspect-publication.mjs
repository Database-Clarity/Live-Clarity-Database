// Offline inspection only: accepts a locally prepared candidate and performs no
// conversion, Git operations, installation or network access.
import { readFileSync } from 'node:fs'
import { inspectState } from './state-v2.mjs'
const [file] = process.argv.slice(2)
if (!file) throw new Error('Usage: node scripts/inspect-publication.mjs INPUT.json')
const { state, outputs, accepted, observedOutput } = JSON.parse(readFileSync(file, 'utf8'))
console.log(JSON.stringify(inspectState(state, outputs, accepted, observedOutput)))
