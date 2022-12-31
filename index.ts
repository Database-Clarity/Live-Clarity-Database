import { existsSync, mkdirSync, writeFileSync } from 'fs'
import _ from 'lodash'
import {
   converterSettings,
   descriptionConverter,
   descriptionFilter,
   getDataFromPerk,
   getSettings,
   Languages,
   LivePerk,
   DescriptionData
} from '@icemourne/description-converter'
import { cleanObject } from '@icemourne/tool-box'
import { database, inventoryItems } from './externalData.js'

export const databaseConverter = (converterType: string) => {
   const settings = getSettings(converterType)
   const newDatabase = _.transform(database, (acc: { [key: string]: LivePerk }, perk, hash) => {
      // first 50 are reserved for internal use only
      if (Number(hash) < 50) return

      const editorDescription = perk.editor.en?.main.trim()

      // remove perks with out description
      if (editorDescription === '') return

      // remove optional perks
      if (!settings.optional && perk.optional) return

      debugger
      // remove perks with bungie description
      if (!settings.optional && editorDescription === inventoryItems[hash]?.displayProperties?.description) return

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

if (!existsSync('./descriptions')) {
   mkdirSync('./descriptions')
}

for (const key in converterSettings) {
   writeFileSync(`./descriptions/${key}.json`, JSON.stringify(databaseConverter(key), undefined, 1))
}

console.log('Completed')
