import { existsSync, mkdirSync, writeFileSync } from 'fs'

import {
   DescriptionData,
   Languages,
   LivePerk,
   converterSettings,
   descriptionConverter,
   descriptionFilter,
   getDataFromPerk,
   getSettings
} from '@icemourne/description-converter'
import { cleanObject, customJsonStringify, persistentFetch } from '@icemourne/tool-box'
import _ from 'lodash'

import { database, inventoryItem } from './externalData.js'

export const databaseConverter = (converterType: string) => {
   const settings = getSettings(converterType)
   const newDatabase = _.transform(database, (acc: { [key: string]: LivePerk }, perk, hash) => {
      // first 50 are reserved for internal use only
      if (Number(hash) < 50) return

      const editorDescription = perk.editor.en?.main.trim() || ''
      // remove perks with out description
      if (editorDescription === '') return
      // remove perks with bungie description
      if (!settings.optional && editorDescription === inventoryItem?.[hash]?.displayProperties?.description) return

      const cleanPerk = getDataFromPerk(perk, settings.getFromPerk)

      const descriptions = Object.entries(cleanPerk.editor).reduce<{ [key: string]: any }>(
         (acc, [language, descriptions]) => {
            const descriptionData: DescriptionData = {
               database,
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

   return cleanObject(newDatabase)
}

if (!existsSync('./database')) {
   mkdirSync('./database')
}
if (!existsSync('./database/descriptions')) {
   mkdirSync('./database/descriptions')
}

for (const key in converterSettings) {
   writeFileSync(
      `./database/descriptions/${key}.json`,
      customJsonStringify(databaseConverter(key), ['stat', 'multiplier', 'weaponTypes', 'classNames'])
   )
}

const version = await persistentFetch(
   'https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/live/versions.json',
   3
)
const newVersion = {
   ...version,
   descriptions: (Number(version.descriptions) + 0.0001).toFixed(4)
}
writeFileSync('./database/versions.json', JSON.stringify(newVersion, null, 1))

console.log('Completed')
