import { digest } from './publish-preflight.mjs'
import { validateState } from './publication-state.mjs'

// Input files are exactly the successfully published bytes read at current HEAD.
// A changed fingerprint with identical descriptions updates state only.
export function stagePublication({ previousFiles, outputs, state, versions, validate }) {
  if (!Number.isFinite(versions?.descriptions)) throw new Error('Invalid descriptions version')
  if (!outputs || !Object.keys(outputs).length) throw new Error('No outputs')
  const files = {}, digests = {}
  for (const [path, content] of Object.entries(outputs)) {
    if (!/^descriptions\/[A-Za-z0-9_-]+\.json$/.test(path) || typeof content !== 'string') throw new Error('Invalid output file')
    JSON.parse(content)
    validate(path, content)
    files[path] = content; digests[path] = digest(content)
  }
  // A missing prior output is not silently deleted or silently adopted.
  for (const path of Object.keys(previousFiles).filter(x => x.startsWith('descriptions/'))) {
    if (!Object.hasOwn(files, path)) throw new Error(`Missing prior output ${path}`)
  }
  const changed = Object.entries(files).some(([path, content]) => previousFiles[path] !== content)
  const nextVersion = { ...versions, descriptions: changed ? Math.round(versions.descriptions * 10000 + 1) / 10000 : versions.descriptions }
  const nextState = { ...state, outputDigests: digests }
  validateState(nextState)
  files['versions.json'] = JSON.stringify(nextVersion, null, 1)
  files['.publication-state.json'] = JSON.stringify(nextState, null, 1)
  return { files, outputChanged: changed }
}
