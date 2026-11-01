// Optimistic commit engine. Adapter stages one tree/commit with the current head
// as its only parent. `compose` must rebase and validate against each new head.
export async function publishAtomic(adapter, compose, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const current = await adapter.readHead()
    const candidate = await compose(current)
    if (candidate === null) return { result: 'unchanged', head: current.head }
    const commit = await adapter.stage(current.head, candidate)
    try {
      await adapter.update(current.head, commit)
      return { result: 'published', head: commit }
    } catch (error) {
      if (error.code === 'ambiguous') {
        const observed = await adapter.readHead()
        if (observed.head === commit) return { result: 'published', head: commit }
        // A successor can contain our commit, even if its state has changed.
        if (await adapter.isAncestor(commit, observed.head)) return { result: 'published', head: commit }
      } else if (error.code !== 409 && error.code !== 422) throw error
    }
  }
  throw new Error('Publication contention: retry limit exhausted')
}
