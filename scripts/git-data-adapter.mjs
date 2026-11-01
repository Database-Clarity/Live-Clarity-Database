// GitHub Git Data adapter; transport is injected for deterministic offline tests.
// No token, branch, or deployment default is supplied by this module.
export function gitDataAdapter(transport, ref, decode) {
  if (!/^heads\/[A-Za-z0-9._/-]+$/.test(ref)) throw new Error('Invalid output ref')
  const call = (method, path, body) => transport(method, path, body)
  return {
    async readHead() {
      const { object } = await call('GET', `/git/ref/${ref}`)
      const commit = await call('GET', `/git/commits/${object.sha}`)
      return { head: object.sha, tree: commit.tree.sha, ...(await decode(commit.tree.sha, call)) }
    },
    async stage(parent, candidate) {
      const old = await call('GET', `/git/commits/${parent}`)
      const entries = []
      for (const [path, content] of Object.entries(candidate.files)) {
        if (!/^(descriptions\/[A-Za-z0-9_-]+\.json|versions\.json|\.publication-state\.json)$/.test(path)) throw new Error('Unexpected publication path')
        const blob = await call('POST', '/git/blobs', { content: Buffer.from(content).toString('base64'), encoding: 'base64' })
        entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha })
      }
      const tree = await call('POST', '/git/trees', { base_tree: old.tree.sha, tree: entries })
      const commit = await call('POST', '/git/commits', { message: candidate.message, tree: tree.sha, parents: [parent] })
      return commit.sha
    },
    async update(_parent, commit) {
      await call('PATCH', `/git/refs/${ref}`, { sha: commit, force: false })
    },
    async isAncestor(ancestor, descendant) {
      const result = await call('GET', `/compare/${ancestor}...${descendant}`)
      if (!['ahead', 'identical', 'behind', 'diverged'].includes(result.status)) throw new Error('Unknown compare status')
      return result.status === 'ahead' || result.status === 'identical'
    }
  }
}
