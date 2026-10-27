# Editor data

Authored Clarity editor v2 data. Do not hand-edit unless you know what you are
doing: normally the editor backend validates and writes this branch.

- `tooltips/<hash>.json`: one core `Tooltip` per hash; 2-space JSON and a newline.
  Reserved hashes (including globals 2 and 3) are retained.
- `config/permissions.json`: roles keyed by numeric GitHub user ID.
- `live/pushed.json`: core content hashes of the last exported live tooltips.
  A current tooltip whose content hash differs is pending.
- `scripts/build-bundle.mjs`: dependency-free Node 22 bundle builder.
- `.github/workflows/bundle.yml`: publishes on pushes to `editor-data`.

The generated bundle is the **only file** on the separate orphan
`editor-data-bundle` branch. It contains `sourceCommit`, `generatedAt`,
`tooltips`, `permissions` and `pushed`. Bot commits never land on `editor-data`.
Concurrent bundle runs cancel older runs.

Migration is maintained in `Description-editor`, branch `v2`, under
`scripts/migrate`. Re-run it at cut-over with fresh intermediate and converter
data. Migration replaces authored tooltips and resets permissions/pushed state;
do not run it after v2 editing starts without coordinating with the owner.
Legacy compatibility metadata is preserved, so pending hashes include metadata
differences, not just text changes.
