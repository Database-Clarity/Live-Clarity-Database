let toolbox
export const initialize = data => { toolbox = data.toolbox }
export const resolve = (specifier, context, nextResolve) => specifier === '@icemourne/tool-box'
  ? { url: 'adoption:toolbox', shortCircuit: true } : nextResolve(specifier, context)
export const load = (url, context, nextLoad) => url !== 'adoption:toolbox' ? nextLoad(url, context) : {
  format: 'module', shortCircuit: true,
  source: `
    export * from ${JSON.stringify(toolbox)};
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    export async function fetchBungieManifest(names) {
      assert.deepEqual(names, ['inventoryItem']);
      if (process.env.ADOPTION_MANIFEST_FAIL === '1') throw new Error('ADOPTION_MANIFEST_FAILURE');
      return { inventoryItem: JSON.parse(fs.readFileSync('inventory.json', 'utf8')) };
    }
    export async function persistentFetch(url, attempts) {
      assert.equal(url, 'https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/live/versions.json');
      assert.equal(attempts, 3);
      if (process.env.ADOPTION_VERSION_FAIL === '1') throw new Error('ADOPTION_VERSION_FAILURE');
      return JSON.parse(fs.readFileSync('versions-input.json', 'utf8'));
    }
  `
}
