# Publisher adoption candidate - HELD

This branch is for independent review, not production adoption. Do not merge it into `converter`, deploy,
write intermediate alias stubs, or release the converter without the existing owner approvals.

The publisher and companion follow converter `4eabf5ad107ac06e8b0d34875b6dbde9c812d523`'s tested examples,
using the actual package imports and passing `databaseSettings`. Reference preflight rejects broken aliases,
missing globals/imports and unclosed associations rather than silently dropping authored content. Output
validation happens after description filtering. All eight conversions and version acquisition succeed before
the CLI writes any files; local filesystem write failures can still leave partial files and must not be deployed.

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
