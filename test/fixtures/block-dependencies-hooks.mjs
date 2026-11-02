export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@icemourne/') || specifier === 'lodash') throw new Error(`unexpected dependency import: ${specifier}`)
  return nextResolve(specifier, context)
}
