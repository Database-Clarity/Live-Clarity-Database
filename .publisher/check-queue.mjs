// G8 read-only audit: cancelled output jobs include queue-cap cancellation.
import { readFileSync } from 'node:fs';
const pages = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const list = Array.isArray(pages) ? pages : [pages];
const runs = list.flatMap((page) => page.workflow_runs ?? []);
if (
  !runs.length ||
  list.some((page) => !Array.isArray(page.workflow_runs)) ||
  (list[0].total_count !== undefined && list[0].total_count > runs.length)
)
  throw new Error('G8: incomplete output-run audit; fetch every page for the reviewed time window');
const cancelled = runs.filter((run) => run.conclusion === 'cancelled');
if (cancelled.length) {
  console.error(
    'G8: cancelled output runs (including queue-cap overflow); reconcile and manually retry pinned inputs: ' +
      cancelled.map((run) => run.id).join(', '),
  );
  process.exitCode = 1;
} else console.log('Output queue audit: no cancelled runs in the complete supplied window');
