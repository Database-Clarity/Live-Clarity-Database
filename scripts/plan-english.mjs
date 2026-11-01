import { structuralQueue, topology } from './structural-queue.mjs'
import { validateState } from './publication-state.mjs'
import { assertSourceOrder } from './source-order.mjs'

// Published source must be the last successful topology source, never a draft.
// Unknown legacy baselines must be explicitly established before this function.
export async function planEnglish(state, publishedSource, acceptedSource, sourceCommit, isAncestor) {
  validateState(state)
  if (!publishedSource || !acceptedSource) throw new Error('Published and accepted topology sources required')
  const ids = [...new Set([...Object.keys(publishedSource), ...Object.keys(acceptedSource)])]
  await assertSourceOrder(state, sourceCommit, ids, ['english'], isAncestor)
  const next = structuredClone(state)
  const queue = structuralQueue(publishedSource, acceptedSource, sourceCommit)
  const blocked = new Set(queue.flatMap(x => x.members))
  next.pending = queue
  for (const id of ids) {
    if (blocked.has(id) || !acceptedSource[id]) continue
    const old = next.components[id]
    next.components[id] = { topology: topology(acceptedSource[id]), english: sourceCommit, translations: old?.translations ?? null }
  }
  return { state: validateState(next), queue }
}
