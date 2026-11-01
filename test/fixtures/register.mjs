import { register, createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./toolbox-hooks.mjs', import.meta.url, {
  data: { toolbox: pathToFileURL(createRequire(import.meta.url).resolve('@icemourne/tool-box')).href }
})
