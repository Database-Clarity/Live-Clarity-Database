import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

import {
  DescriptionData,
  Database,
  IntermediatePerks,
  Languages,
  LiveAlias,
  LivePerk,
  converterSettings,
  descriptionConverter,
  descriptionFilter,
  expandAliases,
  getAliasOutput,
  getDataFromPerk,
  getSettings,
  isAliasStub,
  validateOutputReferences,
  validateReferences
} from '@icemourne/description-converter'
import { cleanObject, customJsonStringify, persistentFetch } from '@icemourne/tool-box'
import _ from 'lodash'

type InventoryItem = { [hash: string]: { displayProperties?: { description?: string } } } | undefined

export const databaseConverter = (
  converterType: string,
  database: IntermediatePerks,
  inventoryItem: InventoryItem,
  databaseSettings?: Database['databaseSettings'],
  languages?: readonly string[]
) => {
  const settings = getSettings(converterType)
  validateReferences(database)
  // alias stubs become full copies of their original, used for every lookup and for the checks below
  const lookup = expandAliases(database)
  const references: { [hash: string]: LiveAlias } = {}

  const newDatabase = _.transform(database, (acc: { [key: string]: LivePerk }, rawPerk, hash) => {
    const aliasOutput = isAliasStub(rawPerk) ? getAliasOutput(settings, rawPerk) : 'copy'
    const perk = lookup[hash]
    // 'skip' is a sandbox alias of a legacy setting, no perk means the alias points at a missing perk
    if (aliasOutput === 'skip' || perk === undefined) return

    // first 50 are reserved for internal use only
    if (Number(hash) < 50) return

    const editorDescription = perk.editor.en?.main.trim() || ''
    // remove perks with out description
    if (editorDescription === '') return
    // remove perks with bungie description
    if (!settings.optional && editorDescription === inventoryItem?.[hash]?.displayProperties?.description) return

    // kept for after the loop, the original may not be output
    if (isAliasStub(rawPerk) && aliasOutput === 'reference') {
      references[hash] = { hash: rawPerk.hash, aliasOf: rawPerk.aliasOf }
      return
    }

    const cleanPerk = getDataFromPerk(perk, settings.getFromPerk)
    if (languages && cleanPerk.updateTracker?.descriptions) {
      cleanPerk.updateTracker.descriptions = Object.fromEntries(
        Object.entries(cleanPerk.updateTracker.descriptions).filter(([language]) => languages.includes(language))
      )
    }

    const descriptions = Object.entries(cleanPerk.editor).reduce<{ [key: string]: any }>(
      (acc, [language, descriptions]) => {
        if (languages && !languages.includes(language)) return acc
        const descriptionData: DescriptionData = {
          database: lookup,
          descriptionString: descriptions[settings.editor],
          editorType: settings.editor,
          hash: cleanPerk.hash as number,
          language: language as Languages
        }
        const convertedDescription = descriptionConverter(descriptionData)
        if (convertedDescription) {
          acc[language] = descriptionFilter(convertedDescription, converterType)
        }
        return acc
      },
      {}
    )

    acc[hash] = {
      ...(_.omit(cleanPerk, 'editor') as any),
      descriptions
    }
  })

  // a reference is only useful if the original is part of the same output, otherwise nothing can be looked up
  for (const [hash, reference] of Object.entries(references)) {
    if (newDatabase[reference.aliasOf] !== undefined) newDatabase[hash] = reference as any
  }

  const output = cleanObject(newDatabase)
  validateOutputReferences(output)
  return output
}

// Conversion is pure with respect to output storage and versions. The caller
// supplies immutable inputs and chooses which languages may be converted.
export const convertPresets = (
  database: IntermediatePerks,
  inventoryItem: InventoryItem,
  databaseSettings: Database['databaseSettings'] | undefined,
  mode: 'english' | 'translations'
) => Object.fromEntries(Object.keys(converterSettings).map(key => [
  key,
  databaseConverter(key, database, inventoryItem, databaseSettings, mode === 'english' ? ['en'] : undefined)
]))

// only publish when started as the program, so databaseConverter can be imported by tests
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { database, databaseSettings, inventoryItem } = await import('./externalData.js')

  const outputs: Record<string, string> = {}
  for (const key in converterSettings) {
    outputs[key] = customJsonStringify(databaseConverter(key, database, inventoryItem, databaseSettings), [
      'stat',
      'multiplier',
      'weaponTypes',
      'classNames'
    ])
  }

  type Versions = {
    descriptions: number
  }

  const version = await persistentFetch<Versions>(
    'https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/live/versions.json',
    3
  )
  const newVersion = {
    ...version,
    descriptions: Number((version.descriptions * 10000 + 1).toFixed(4)) / 10000
  }

  if (!existsSync('./database/descriptions')) {
    mkdirSync('./database/descriptions', { recursive: true })
  }
  for (const [key, output] of Object.entries(outputs)) {
    writeFileSync(`./database/descriptions/${key}.json`, output)
  }
  writeFileSync('./database/versions.json', JSON.stringify(newVersion, null, 1))

  console.log('Completed')
}
