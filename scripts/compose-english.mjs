// Compose English rows against the last successful output. Queued members are
// copied verbatim; filtered rows with translations remain present.
export function composeEnglish(previous, converted, queue) {
  const blocked = new Set(queue.flatMap(component => component.members))
  const result = structuredClone(previous)
  for (const id of new Set([...Object.keys(previous), ...Object.keys(converted)])) {
    if (blocked.has(id)) continue
    const old = previous[id], fresh = converted[id]
    if (!fresh) {
      if (!old || old.aliasOf != null) continue
      const row = structuredClone(old)
      if (row.descriptions) delete row.descriptions.en
      if (row.updateTracker?.descriptions) delete row.updateTracker.descriptions.en
      // Preserve the row even if empty: deletion is a structural operation.
      result[id] = row
      continue
    }
    if (fresh.aliasOf != null || old?.aliasOf != null) {
      if (JSON.stringify(fresh) !== JSON.stringify(old)) throw new Error(`Unqueued reference change ${id}`)
      continue
    }
    const row = structuredClone(fresh)
    const previousDescriptions = old?.descriptions ?? {}
    row.descriptions = { ...previousDescriptions }
    if (Object.hasOwn(fresh.descriptions ?? {}, 'en')) row.descriptions.en = fresh.descriptions.en
    if (!Object.hasOwn(fresh.descriptions ?? {}, 'en')) delete row.descriptions.en
    const previousTrackers = old?.updateTracker?.descriptions
    const freshTrackers = fresh.updateTracker?.descriptions
    if (previousTrackers || freshTrackers) {
      row.updateTracker = { ...fresh.updateTracker, descriptions: { ...previousTrackers } }
      if (Object.hasOwn(freshTrackers ?? {}, 'en')) row.updateTracker.descriptions.en = freshTrackers.en
      if (!Object.hasOwn(freshTrackers ?? {}, 'en')) delete row.updateTracker.descriptions.en
    }
    result[id] = row
  }
  return result
}
