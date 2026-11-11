import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalHash, itemFor } from '../.report-source/apps/web/src/features/navigation/catalog.ts';
import { variantForm } from '../.report-source/apps/web/src/features/tooltip/variants.ts';
import { resolveAlias } from '../.report-source/packages/core/src/aliases.ts';
import { languages } from '../.report-source/packages/core/src/languages.ts';
const output = process.argv[2];
const read = async (path) => JSON.parse(await readFile(path, 'utf8'));
const bundle = await read(join(output, 'bundle.json'));
const generator = '.report-generator';
const generatorCommit = process.env.REPORTS_GENERATOR_COMMIT;
if (!/^[a-f0-9]{40}$/.test(generatorCommit ?? '')) throw new Error('A pinned generator commit is required');
const [items, categories, aliases] = await Promise.all(['items', 'categories', 'aliases'].map((name) => read(join(generator,'templates/v2',name+'.json'))));
const data = { items, categories, aliases, bundle };
const worker = {}, picker = {};
const hashes = new Set([...Object.keys(items), ...Object.keys(aliases), ...Object.keys(bundle.tooltips)]);
for (const key of hashes) {
  const hash = Number(key);
  if (!Number.isInteger(hash) || hash < 0 || hash > 0xffffffff) throw new Error('Invalid hash');
  const owner = canonicalHash(hash, data);
  const resolved = resolveAlias(hash, aliases);
  const form = resolved === owner ? 'base' : variantForm(owner, resolved, data);
  const variant = form === 'base' ? 'base' : form === 'derived' ? 'enhanced' : 'override:'+resolved;
  const tooltip = bundle.tooltips[form === 'override' ? resolved : owner];
  if (!tooltip || tooltip.archive) continue;
  const langs = languages.filter((lang) => tooltip.text[lang]?.text?.trim());
  const item = itemFor(hash,data) ?? itemFor(resolved,data) ?? itemFor(owner,data);
  if (!langs.length || !item) continue;
  worker[hash] = { owner, langs, variant };
  picker[hash] = { ...worker[hash], name:item.name, icon:item.icon, category:item.categoryId, type:categories.find((c) => c.id===item.categoryId)?.legacyType ?? item.categoryId };
}
for (const [name, entries] of [['report-items.worker',worker],['report-items',picker]]) {
  await writeFile(join(output,name+'.json'),JSON.stringify({v:1,sourceCommit:bundle.sourceCommit,generatorCommit,items:entries})+'\n');
}
