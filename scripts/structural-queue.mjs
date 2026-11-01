// Pure queue calculation. This module does not write or publish state.
import { canonical, digest } from './publish-preflight.mjs'

export function topology(row) {
  if (!row) return null
  // Changes to an import target alter the dependency graph even when alias
  // and association fields stay unchanged. Inspect both editor fields in
  // every language, including imports nested inside exported text.
  const imports = []
  for (const [language, entry] of Object.entries(row.editor ?? {})) {
    for (const [field, value] of Object.entries(entry ?? {})) {
      if (typeof value !== 'string') continue
      for (const match of value.matchAll(/^import [A-z0-9 ]+? from (\d+|global) *?$/gm)) imports.push([language, field, match[1]])
    }
  }
  imports.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  return { aliasOf: row.aliasOf ?? null, aliasKind: row.aliasKind ?? null, associated: row.associated ?? [], imports }
}
export function dependencies(row) {
  if (!row) return []
  const out = []
  if (row.aliasOf != null) out.push(String(row.aliasOf))
  for (const id of row.associated ?? []) out.push(String(id))
  for (const entry of Object.values(row.editor ?? {})) {
    for (const text of Object.values(entry ?? {})) {
      if (typeof text !== 'string') continue
      for (const match of text.matchAll(/^import [A-z0-9 ]+? from (\d+|global) *?$/gm)) {
        if (match[1] === 'global') out.push('1', '2', '3')
        else out.push(match[1])
      }
    }
  }
  return out
}
export function structuralQueue(published, accepted, sourceCommit) {
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error('Expected immutable source commit')
  const ids = new Set([...Object.keys(published), ...Object.keys(accepted)])
  const edges = new Map([...ids].map(id => [id, new Set()]))
  for (const id of ids) for (const row of [published[id], accepted[id]]) {
    for (const target of dependencies(row)) {
      if (!edges.has(target)) throw new Error(`Missing dependency ${target}`)
      edges.get(id).add(target); edges.get(target).add(id)
    }
  }
  const changed = new Set([...ids].filter(id => canonical(topology(published[id])) !== canonical(topology(accepted[id]))))
  // Converter uses global variable 2 and global titles 3 implicitly. If their
  // dependency topology changes, any converted row may depend on that change.
  // Conservatively connect all rows for that generation; ordinary changes to
  // other rows do not become connected through these shared globals.
  if (changed.has('2') || changed.has('3')) {
    const root = changed.has('2') ? '2' : '3'
    for (const id of ids) { edges.get(root).add(id); edges.get(id).add(root) }
  }
  const queue = []
  const visited = new Set()
  for (const start of [...changed].sort()) {
    if (visited.has(start)) continue
    const stack = [start], members = []
    while (stack.length) {
      const id = stack.pop()
      if (visited.has(id)) continue
      visited.add(id); members.push(id)
      for (const neighbor of edges.get(id)) stack.push(neighbor)
    }
    members.sort()
    const generation = digest(canonical({ sourceCommit, members, topology: members.map(id => [id, topology(accepted[id])]) }))
    queue.push({ generation, sourceCommit, members })
  }
  return queue
}
