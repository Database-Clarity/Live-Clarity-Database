import { validateState } from './publication-state.mjs'
import { topology } from './structural-queue.mjs'

// Rebase a completed scheduled conversion on freshly read state. A structural
// component is eligible only when its queued generation and watermarks match
// the snapshot used for conversion. The caller retries skipped components.
export function promoteTranslations({ currentState, snapshotState, currentOutputs, convertedOutputs, sourceCommit, fingerprint, acceptedSource }) {
  validateState(currentState); validateState(snapshotState)
  if (!/^[a-f0-9]{40}$/.test(sourceCommit) || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Invalid translation provenance')
  const outputs = structuredClone(currentOutputs)
  const state = structuredClone(currentState)
  const pendingMembers = new Set(currentState.pending.flatMap(x => x.members))
  const promoted = [], deferred = []
  const retained = new Map()
  const retain = (id, lang) => { if (!retained.has(id)) retained.set(id, new Set()); retained.get(id).add(lang) }
  for (const item of snapshotState.pending) {
    const now = currentState.pending.find(x => x.generation === item.generation)
    const sameMembers = now && JSON.stringify(now.members) === JSON.stringify(item.members)
    const unchanged = sameMembers && item.members.every(id => JSON.stringify(currentState.components[id] ?? null) === JSON.stringify(snapshotState.components[id] ?? null))
    if (!unchanged) { deferred.push(item.generation); continue }
    if (item.sourceCommit !== sourceCommit || !acceptedSource) { deferred.push(item.generation); continue }
    for (const id of item.members) {
      for (const preset of Object.keys(outputs)) {
        if (!Object.hasOwn(convertedOutputs, preset)) throw new Error(`Missing converted preset ${preset}`)
        const next = convertedOutputs[preset][id]
        const previous = outputs[preset][id]
        if (previous && !next && Object.hasOwn(acceptedSource, id)) throw new Error(`Structural output missing for ${id}`)
        if (previous && next && previous.aliasOf == null && next.aliasOf == null) {
          for (const language of Object.keys(previous.descriptions ?? {})) {
            if (language !== 'en' && !Object.hasOwn(next.descriptions ?? {}, language)) throw new Error(`Structural translation missing for ${id}/${language}`)
          }
          for (const language of Object.keys(previous.updateTracker?.descriptions ?? {})) {
            if (language !== 'en' && !Object.hasOwn(next.updateTracker?.descriptions ?? {}, language)) throw new Error(`Structural tracker missing for ${id}/${language}`)
          }
        }
        if (next === undefined) delete outputs[preset][id]
        else outputs[preset][id] = structuredClone(next)
      }
      if (acceptedSource[id]) state.components[id] = { topology: topology(acceptedSource[id]), english: sourceCommit, translations: sourceCommit }
      else delete state.components[id]
    }
    promoted.push(item.generation)
  }
  state.pending = state.pending.filter(x => !promoted.includes(x.generation))
  for (const [preset, rows] of Object.entries(outputs)) {
    const converted = convertedOutputs[preset]
    if (!converted) throw new Error(`Missing converted preset ${preset}`)
    for (const [id, old] of Object.entries(rows)) {
      if (pendingMembers.has(id) || old?.aliasOf != null) continue
      // A different successful translation since conversion started must not
      // be replaced by an older run. Fail the whole attempt for safe retry.
      if ((currentState.components[id]?.translations ?? null) !== (snapshotState.components[id]?.translations ?? null)) throw new Error(`Translation watermark changed: ${id}`)
      const next = converted[id]
      if (!next || next.aliasOf != null) continue
      for (const lang of Object.keys(old.descriptions ?? {})) if (lang !== 'en' && !Object.hasOwn(next.descriptions ?? {}, lang)) retain(id, lang)
      for (const lang of Object.keys(old.updateTracker?.descriptions ?? {})) if (lang !== 'en' && !Object.hasOwn(next.updateTracker?.descriptions ?? {}, lang)) retain(id, lang)
      const descriptions = { ...old.descriptions, ...next.descriptions }
      if (Object.hasOwn(old.descriptions ?? {}, 'en')) descriptions.en = old.descriptions.en
      else delete descriptions.en
      old.descriptions = descriptions
      if (old.updateTracker?.descriptions || next.updateTracker?.descriptions) {
        const trackers = { ...old.updateTracker?.descriptions, ...next.updateTracker?.descriptions }
        if (Object.hasOwn(old.updateTracker?.descriptions ?? {}, 'en')) trackers.en = old.updateTracker.descriptions.en
        else delete trackers.en
        old.updateTracker = { ...old.updateTracker, descriptions: trackers }
      }
      if (state.components[id] && !retained.has(id)) state.components[id].translations = sourceCommit
    }
  }
  for (const id of retained.keys()) if (state.components[id]) state.components[id].translations = currentState.components[id]?.translations ?? null
  // Do not claim the fingerprint while any generation from this conversion was
  // deferred or a later generation exists; the next run must retry.
  if (deferred.length === 0 && state.pending.length === 0) state.translationFingerprint = fingerprint
  const stillQueued = new Set(state.pending.flatMap(item => item.members))
  for (const [id, langs] of Object.entries(currentState.retainedLanguages ?? {})) {
    if (stillQueued.has(id)) for (const lang of langs) retain(id, lang)
  }
  state.retainedLanguages = Object.fromEntries([...retained].map(([id, langs]) => [id, [...langs].sort()]))
  return { state, outputs, promoted, deferred }
}
