import { validateState } from './publication-state.mjs'
// Reject source regressions and divergent accepted histories before applying
// component results. English and translation watermarks advance independently.
export async function assertSourceOrder(state, sourceCommit, members, kinds, isAncestor) {
  validateState(state)
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Invalid accepted source')
  if (kinds.some(kind => !['english', 'translations'].includes(kind))) throw new Error('Invalid watermark kind')
  for (const id of members) for (const kind of kinds) {
    const prior = state.components[id]?.[kind]
    if (prior && prior !== sourceCommit && !(await isAncestor(prior, sourceCommit))) throw new Error(`Stale or divergent ${kind} source for ${id}`)
  }
}
