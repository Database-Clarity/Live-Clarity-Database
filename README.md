# Publisher adoption candidate - HELD

This branch is for independent review, not production adoption. Do not merge it into `converter`, deploy,
write intermediate alias stubs, or release the converter without the existing owner approvals.

The publisher and companion follow converter `047673916754f2b4a9af2635612dac8876af0dd7`'s tested examples,
using the actual package imports and passing `databaseSettings`. Reference preflight rejects broken aliases,
missing globals/imports and unclosed associations rather than silently dropping authored content. Output
validation happens after description filtering. All eight conversions and version acquisition succeed before
the CLI writes any files; local filesystem write failures can still leave partial files and must not be deployed.
Named imports require authored exports, even for Object-prototype names such as `constructor`, `__proto__` and
`toString`; explicitly authored and empty exports remain valid. Offline tests exercise both scopes in all presets
and assert that missing names fail the actual CLI before creating outputs or advancing versions.

## Reproducible review installation

The declared converter version `1.0.56` is not available in npm. For this isolated candidate only, the manifest
and generated lock pin its exact Git commit. Its `prepare` lifecycle builds the package. This is a source-pinned
review dependency, **not** a registry release or permission to bypass the npm publication gate.

```sh
npm ci
npm run build
npm test
```

The candidate workflow runs those checks on Node 20 with read-only repository permissions. It has no deployment
step, no production `converter` push trigger, and no floating `npm install` after `npm ci`. The production branch
and its workflow are unchanged.

Before adoption, an independent Sol review must approve both exact candidates. After explicit owner authorization
of the converter main/npm release, replace the Git dependency with the exact approved registry version, regenerate
the lock through npm, verify registry integrity/source equivalence and rerun the offline/real-manifest checks.
The final registry lock and production deployment workflow also require review and owner adoption authorization;
this check-only workflow must not be mistaken for a ready production release.

`npm run convert` is side-effectful: it reads `liveDescriptions.json`, fetches live inventory/version inputs and
writes the eight description files and `versions.json` under `database`. Do not run it against production inputs
or reuse output from a failed run. Tests use explicit local network-boundary fixtures and never publish.

## Publish split work in progress

This branch contains an experimental loopback-only publisher; it is not a
production candidate. The existing `npm run convert` and workflow still use
the legacy full conversion and version flow. The fake pipeline exercises an
atomic Git adapter, component watermarks, structural queue and manifest input,
but the complete race, provenance and format acceptance matrix remains open.
Do not enable a trigger, bootstrap a publication state, or use these helpers
to write live output. Independent review and production approvals remain held.

The optional conversion language filter leaves the full input available to
imports. When all three `PUBLISH_ACCEPTED_PATH`, `PUBLISH_INVENTORY_PATH` and
`PUBLISH_INVENTORY_SHA256` are provided, the CLI reads those local files and
verifies the inventory bytes; the caller is responsible for resolving immutable
refs and manifest identity. The preflight helper is built-in-only and compares
its conservative render fingerprint to a provided successful state. It does
not fetch refs, publish, or persist that state. The atomic helper requires a
caller-supplied adapter and safe composition logic; tests use only fake Git.

The current WIP state validator records `schemaVersion`, per-hash topology and
English/translation source commit watermarks, `pending` entries (generation,
sourceCommit, members), translation fingerprint and output digests. These
fields are experimental and are not an editor transport contract yet. For
compatible topology, `retainedLanguages` records carried-forward language
payloads that could not be refreshed, while their prior component translation
watermark remains unchanged. Never clear queue entries or signal compiled
success from the accepted-input marker.

The status inspection fixture returns `initialization-required` for missing
state and `recovery-required` for invalid state, with published coverage
unknown. Invalid current input is reported separately as `input-unavailable`.
An initialized result includes the observed accepted source,
last evaluated accepted source, queued generations, component watermarks and
retained languages. Queue entries identify their source repository, commit,
blob, generation and member hashes; only a successful publication of that
generation can promote it. When a later accepted source replaces or reverts
a generation, the fake publisher records it as `superseded` with the replacing
source rather than reporting it as published.
Translation freshness is `current`, `pending`, `retained`, or `unknown`;
without current accepted blob bytes, manifest identity and publisher identity
it is unknown. When supplied, the status fixture verifies the blob and computes
the fingerprint rather than accepting a claimed success hash.
`pendingAcceptedWork` is nullable when freshness cannot be determined. This
shape is not yet a reviewed editor or Worker transport contract.

The legacy output has a historically linked source commit, but its executed
dependency and manifest baseline is not certified. Treating accepted input as
the already-published component topology would
assume that its structural edits were already published. An English-only run
cannot safely decide which components are independent until a trustworthy
baseline is established. The current tree reader fails on absent state, and
`planEnglish` requires a supplied published source. Missing state reports
`initialization-required` with unknown published coverage; an offline initial
all-language candidate can be prepared without writing the output branch.
The schema and simulator remain incomplete; do not use them for activation.
The files under `docs/workflows` are deliberately failing inactive sketches;
they do not register schedules or dispatches. Four UTC opportunities are
00:17, 06:17, 12:17 and 18:17; real registration requires a reviewed default
workflow, immutable approved publisher code and separate owner approval.

An initialization integration exercise is available after `npm ci` and
`npm run build` via `node scripts/initialize-fake-http.mjs
http://127.0.0.1:PORT CONFIG.json`; CONFIG specifies `inventoryPath`,
`manifestVersion`, and `manifestPath`. It refuses non-loopback endpoints and
uses a fixture Git API with `heads/accepted` and `heads/output`. The automated
fixture runs with `node --test test/initialize-http.test.mjs`. This is not a
production initializer: full provenance, manifest identity retrieval,
format/coverage validation, initialized incremental publication and the
complete race matrix remain outstanding. Do not expose a real Git proxy on
its loopback endpoint or use it for an output write.

The initialized fixture publisher can be exercised through the same fake Git
server with `node scripts/publish-fake-http.mjs http://127.0.0.1:PORT
CONFIG.json english` or `translations`. It refuses non-loopback endpoints.
`node --test test/initialize-http.test.mjs` runs the initialization and both
mode sequences. This remains experimental: concurrent interleavings, all
structural cases, provenance/format validation and the full acceptance matrix
are not complete; it must not be connected to a real repository or proxy.

The experimental state identifies each retained source snapshot by repository,
commit and blob together; the same blob at different commits has distinct
provenance. Incremental fake HTTP tests also exercise a manifest metadata and
inventory GET fixture, and barrier-controlled Git ref conflicts. These tests
are partial: the complete interleaving, closure, bootstrap, format and
production-gating acceptance matrix remains outstanding.

The offline baseline-import preview checks a signed attestation and hashes of
the execution, dependency, manifest, graph and legacy-mapping artifacts. Its
public key must be independently authorized; the preview does not establish
that the signer or the underlying evidence is trustworthy, and performs no
repository write. The separate loopback-only `import-baseline-fake-http.mjs`
exercises a fixture Git state commit; it cannot validate a real trust anchor
or authorize an output write. A verified legacy import preserves seven legacy
files and the version bytes and records an unknown translation fingerprint.
