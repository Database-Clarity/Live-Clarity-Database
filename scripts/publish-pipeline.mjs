import { preflight } from './publish-preflight.mjs'
import { validateInitialized } from './state-v2.mjs'

// The caller supplies I/O boundaries. Publication is responsible for re-reading
// current state and recomposing on every CAS retry; this function never writes
// successful state during preflight or conversion.
export async function runPipeline({ mode, resolveAccepted, resolveManifest, readOutput, publisher, fetchInventory, installAndBuild, convert, publish }) {
  if (!['english', 'translations'].includes(mode)) throw new Error('Unknown publish mode')
  const accepted = await resolveAccepted()
  const manifest = await resolveManifest()
  const output = await readOutput()
  if (output.state == null) throw new Error('initialization-required')
  try { validateInitialized(output.state, output.files) } catch { throw new Error('recovery-required') }
  const check = preflight({ input: accepted.input, manifest, publisher, state: output.state })
  if (mode === 'translations' && check.result === 'unchanged' && output.state.pending.length === 0) return { result: 'unchanged', fingerprint: check.fingerprint }
  const inventory = await fetchInventory(manifest)
  await installAndBuild()
  const converted = await convert({ mode, accepted, inventory, languages: mode === 'english' ? ['en'] : undefined })
  return publish({ mode, accepted, manifest, inventory, converted, snapshot: output, fingerprint: check.fingerprint })
}
