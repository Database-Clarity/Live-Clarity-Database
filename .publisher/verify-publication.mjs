// G5-installed verifier. Input is data from the serialized publisher job, never code.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';

const p = JSON.parse(process.env.PUBLICATION);
const [converter, producer, pins, live] = process.argv.slice(2);
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { maxBuffer: 128 << 20 });
const text = (dir, ...args) =>
  git(dir, ...args)
    .toString('utf8')
    .trim();
const blob = (dir, commit, path) => text(dir, 'rev-parse', `${commit}:${path}`);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const key of [
  'commit',
  'recordCommit',
  'sourceCommit',
  'requestBlob',
  'receiptBlob',
  'inputBlob',
  'enginePin',
  'generatorSha',
  'publisherSha',
])
  assert.match(p[key], /^[a-f0-9]{40}$/);
for (const key of ['inputSha256', 'engineSha256', 'publisherDigest', 'verifierSha256'])
  assert.match(p[key], /^[a-f0-9]{64}$/);
assert.match(p.opId, /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
assert.match(
  p.receiptPath,
  /^\.publish\/receipts\/\d{4}-\d{2}\/[0-7][0-9A-HJKMNP-TV-Z]{25}\.json$/,
);
assert.ok(p.receiptPath.endsWith(`/${p.opId}.json`));
assert.equal(
  text(converter, 'rev-parse', 'HEAD'),
  p.commit,
  'Converter checkout differs from publication',
);
assert.equal(
  text(producer, 'rev-parse', 'HEAD'),
  p.recordCommit,
  'Producer checkout differs from RECORD',
);
assert.equal(blob(converter, p.commit, p.receiptPath), p.receiptBlob);
assert.equal(blob(converter, p.commit, 'liveDescriptions.json'), p.inputBlob);
assert.equal(hash(git(converter, 'show', `${p.commit}:liveDescriptions.json`)), p.inputSha256);
assert.equal(text(converter, 'show', `${p.commit}:.exports/PIN`), p.enginePin);
assert.equal(hash(git(converter, 'show', `${p.commit}:.exports/engine.mjs`)), p.engineSha256);
const receipt = JSON.parse(git(converter, 'show', `${p.commit}:${p.receiptPath}`));
for (const key of [
  'opId',
  'sourceCommit',
  'requestBlob',
  'generatorSha',
  'publisherSha',
  'outcome',
  'verifierSha256',
])
  assert.equal(receipt[key], p[key]);
assert.ok(['published', 'unchanged'].includes(p.outcome));
const logPath = p.receiptPath.replace('.publish/receipts/', 'publish/log/');
const log = JSON.parse(git(producer, 'show', `${p.recordCommit}:${logPath}`));
assert.equal(log.candidateCommit, p.commit, 'RECORD does not confirm the published commit');
assert.ok(['done', 'unchanged'].includes(log.result.status));
const config = JSON.parse(readFileSync(`${producer}/.publisher/config.json`));
assert.equal(config.liveBranch, 'converter');
assert.equal(config.publisherSha, p.publisherSha);
assert.equal(config.generatorSha, p.generatorSha);
assert.equal(hash(readFileSync(`${producer}/.publisher/publisher.mjs`)), p.publisherDigest);
if (pins) {
  const pin = JSON.parse(readFileSync(`${pins}/pins/latest.json`));
  const history = text(live, 'log', '--first-parent', '-n', '500', '--format=%H%x00%B%x1e', 'HEAD');
  const deploy = history.split('\x1e').find((message) => /^Export-Converter: /m.test(message));
  assert.equal(/^Export-Converter: ([a-f0-9]{40})$/m.exec(deploy)?.[1], pin.converterSha);
  assert.equal(/^Export-Pin: (\S+)$/m.exec(deploy)?.[1], pin.pinId);
  assert.equal(deploy.trim().split('\0')[0], pin.liveCommit);
  assert.deepEqual(JSON.parse(readFileSync(`${pins}/pins/${pin.liveCommit}.json`)), pin);
  if (pin.converterSha !== p.commit && /^[a-f0-9]{40}$/.test(pin.converterSha)) {
    try {
      git(converter, 'merge-base', '--is-ancestor', p.commit, pin.converterSha);
      console.log('Site output: newer input already built; older pinned input is a green no-op');
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'build=false\n');
      process.exit(0);
    } catch {
      /* A missing, older, or unrelated pin is not eligible. */
    }
  }
  assert.equal(pin.converterSha, p.commit, 'Site pin differs from publication');
  assert.equal(pin.inputSha256, p.inputSha256);
  assert.equal(pin.engine, p.enginePin);
  assert.equal(pin.generatorSha, p.generatorSha);
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'build=true\n');
