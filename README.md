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

This branch contains preliminary, isolated helpers only; it is not a publish
candidate. The existing CLI and workflow still use the legacy full conversion
and version flow. Do not enable a trigger, bootstrap a publication state, or
use these helpers to write live output. The required atomic output adapter,
component watermarks, queue persistence and generation-aware translation
promotion, immutable source/manifest resolution, CLI orchestration, and
inactive workflow templates are not implemented. The pure queue is an initial
calculation, not a complete editor-facing queue contract. Independent review
and all production approvals remain outstanding.

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
fields are experimental and are not an editor transport contract yet. A
matched scheduled generation can be promoted by the isolated composition
helper; it does not by itself validate ancestry or reference closure. Never
clear queue entries or signal compiled success from the accepted-input marker.

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
