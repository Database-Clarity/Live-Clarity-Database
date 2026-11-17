import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function buildBundle(root, sourceCommit, generatedAt = new Date().toISOString()) {
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error('A full source commit SHA is required');
  const tooltips = {};
  const entries = await readdir(join(root, 'tooltips'), { withFileTypes: true });
  if (entries.length === 0) throw new Error('No tooltips found');
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.isFile() || !/^(0|[1-9]\d*)\.json$/.test(entry.name)) {
      throw new Error(`Unexpected tooltip entry: ${entry.name}`);
    }
    const hash = entry.name.slice(0, -5);
    const tooltip = await readJson(join(root, 'tooltips', entry.name));
    if (!tooltip || tooltip.hash !== Number(hash) || tooltip.hash > 0xffffffff) {
      throw new Error(`Tooltip hash does not match filename: ${entry.name}`);
    }
    tooltips[hash] = tooltip;
  }
  const permissions = await readJson(join(root, 'config', 'permissions.json'));
  const pushed = await readJson(join(root, 'live', 'pushed.json'));
  let inactiveMoves;
  try {
    inactiveMoves = await readJson(join(root, 'config', 'inactive.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (
    inactiveMoves !== undefined &&
    (!inactiveMoves ||
      typeof inactiveMoves !== 'object' ||
      Array.isArray(inactiveMoves) ||
      Object.entries(inactiveMoves).some(
        ([hash, move]) =>
          !/^(0|[1-9]\d*)$/.test(hash) ||
          Number(hash) > 0xffffffff ||
          !move ||
          typeof move !== 'object' ||
          Array.isArray(move) ||
          !Number.isInteger(move.by) ||
          move.by <= 0 ||
          typeof move.at !== 'string' ||
          !Number.isFinite(Date.parse(move.at)) ||
          (move.note !== undefined && (typeof move.note !== 'string' || move.note.length > 1000)) ||
          (move.inactive !== undefined && move.inactive !== false) ||
          Object.keys(move).some((key) => !['by', 'at', 'note', 'inactive'].includes(key)),
      ))
  )
    throw new Error('Invalid inactive moves');
  if (!permissions || typeof permissions.users !== 'object' || permissions.users === null) {
    throw new Error('Invalid permissions users');
  }
  if (!pushed || typeof pushed !== 'object' || Array.isArray(pushed)) {
    throw new Error('Invalid pushed map');
  }
  for (const [hash, digest] of Object.entries(pushed)) {
    if (
      !/^(0|[1-9]\d*)$/.test(hash) ||
      Number(hash) > 0xffffffff ||
      !/^[0-9a-f]{64}$/.test(digest)
    ) {
      throw new Error(`Invalid pushed entry: ${hash}`);
    }
  }
  // Maintainer sandbox picks (config/sandbox-pointers.json) ride along for the editor's alias
  // view; omitted while the file is absent or holds no picks, so such bundles are unchanged. A
  // malformed file is left out rather than failing the bundle (the Worker fails closed on it).
  let sandboxPointers;
  try {
    sandboxPointers = await readJson(join(root, 'config', 'sandbox-pointers.json'));
  } catch {
    sandboxPointers = undefined; // absent or not JSON
  }
  const picks = sandboxPointers?.pointers;
  if (
    sandboxPointers?.version !== 1 ||
    !picks ||
    typeof picks !== 'object' ||
    Array.isArray(picks) ||
    !Object.keys(picks).length
  )
    sandboxPointers = undefined;
  let aliasGroups;
  let hasAliasGroups = true;
  try {
    aliasGroups = await readJson(join(root, 'config', 'alias-groups.json'));
  } catch (error) {
    if (error.code === 'ENOENT') hasAliasGroups = false;
    else if (error instanceof SyntaxError) aliasGroups = null;
    else throw error;
  }
  return {
    sourceCommit,
    generatedAt,
    tooltips,
    permissions,
    pushed,
    ...(hasAliasGroups ? { aliasGroups } : {}),
    ...(inactiveMoves && Object.keys(inactiveMoves).length ? { inactiveMoves } : {}),
    ...(sandboxPointers ? { sandboxPointers } : {}),
  };
}

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error('Usage: node scripts/build-bundle.mjs <output bundle.json>');
  const bundle = await buildBundle(process.cwd(), process.env.GITHUB_SHA ?? '');
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(output, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(
    `Bundled ${Object.keys(bundle.tooltips).length} tooltips from ${bundle.sourceCommit}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('Bundle failed:', error);
    process.exitCode = 1;
  });
}
