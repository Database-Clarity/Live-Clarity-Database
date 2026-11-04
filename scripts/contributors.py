"""Update only the marked README block. Requires Python 3, git and authenticated gh.

Run from the repository root after fetching all branch heads. No Python packages.
Commit counts include merges and commits with only excluded files (zero lines).
Lines use git's normal non-merge numstat: merges add no duplicate line credit.
Historical liveDescriptions.json/intermediateDescriptions.json are editable inputs,
so they deliberately remain counted. See contributors-exclusions.json for outputs.
"""
import argparse
from collections import defaultdict
import fnmatch
import json
from pathlib import Path
import re
import subprocess
import time

START = b'<!-- contributors:start -->'
END = b'<!-- contributors:end -->'
ROLES = [('maintainer', 'Maintainers'), ('editor', 'Editors'),
         ('translator', 'Translators'), ('trial', 'Trials')]


def command(*args):
    return subprocess.check_output(args)


def rewrite(original, block):
    """Keep prefix/suffix bytes, including original newlines, exactly intact."""
    if original.count(START) != 1 or original.count(END) != 1:
        raise ValueError('README must contain exactly one pair of contributor markers')
    start, end = original.index(START) + len(START), original.index(END)
    if start > end:
        raise ValueError('Contributor markers are reversed')
    return original[:start] + b'\n' + block.encode('utf-8') + b'\n' + original[end:]


def identity(name, email, api_author):
    """The commit's API author wins; otherwise accept only GitHub noreply."""
    login = (api_author or {}).get('login')
    if not login:
        match = re.fullmatch(r'(?:\d+\+)?([A-Za-z0-9-]+(?:\[bot\])?)@users\.noreply\.github\.com', email, re.I)
        login = match[1] if match else None
    bot = ((api_author or {}).get('type') == 'Bot' or
           any('[bot]' in value.lower() for value in (name, email, login or '')) or
           (login or name).lower() in ('dependabot', 'github-actions'))
    return login, bot


def api_authors(shas):
    """Batch exact commit lookups; never infer accounts from names or emails."""
    authors = {}
    for offset in range(0, len(shas), 100):
        batch = shas[offset:offset + 100]
        if not all(re.fullmatch(r'[0-9a-f]{40}', sha) for sha in batch):
            raise ValueError('Invalid commit SHA')
        fields = ' '.join(f'c{i}: object(oid: "{sha}") {{ ... on Commit {{ author {{ user {{ login }} }} }} }}'
                          for i, sha in enumerate(batch))
        query = '{ repository(owner: "Database-Clarity", name: "Live-Clarity-Database") { ' + fields + ' } }'
        response = subprocess.run(['gh', 'api', 'graphql', '--input', '-'],
                                  input=json.dumps({'query': query}).encode(),
                                  stdout=subprocess.PIPE, check=True)
        payload = json.loads(response.stdout)
        if payload.get('errors'):
            raise ValueError(payload['errors'])
        for i, sha in enumerate(batch):
            commit = payload['data']['repository'][f'c{i}']
            if commit is None:
                raise ValueError('GitHub cannot resolve commit ' + sha)
            authors[sha] = commit['author']['user']
    return authors


def role_groups(users, people):
    groups = {role: [] for role, _ in ROLES}
    groups['former'] = []
    current = {}
    for user in users.values():
        if user['role'] not in groups or user['role'] == 'former':
            raise ValueError('Unknown permissions role: ' + user['role'])
        login = user['login']
        if not re.fullmatch(r'[A-Za-z0-9-]+', login):
            raise ValueError('Invalid permissions login')
        key = login.lower()
        if key in current:
            raise ValueError('Duplicate permissions login')
        current[key] = user
        groups[user['role']].append((login, user.get('languages', []), people.get(key, {})))
    for key, person in people.items():
        if key not in current:
            groups['former'].append((person['label'], [], person))
    return groups


def safe(value):
    # Unmatched names and language labels cannot inject Markdown or HTML.
    return re.sub(r'([\\`*_{}\[\]()<>|#!])', r'\\\1', str(value)).replace('\n', ' ').replace('\r', ' ')


def render(users, people):
    groups = role_groups(users, people)
    lines = ['## Contributors', '',
             'Current roles come from `editor-data:config/permissions.json`. Totals cover all fetched branch history, counting each commit SHA once.', '',
             'Bots are excluded. Commits include merges and output-only changes; line totals exclude merges and [generated outputs](scripts/contributors-exclusions.json). Historical editable JSON inputs remain included. These totals describe repository activity, not the value of a contribution.', '']
    for role, title in ROLES + [('former', 'Former contributors')]:
        lines += ['### ' + title, '']
        rows = groups[role]
        if not rows:
            lines += ['None currently listed.' if role != 'former' else 'None.', '']
            continue
        lines += ['| Contributor | Languages | Commits | Added | Removed |',
                  '| --- | --- | ---: | ---: | ---: |']
        for login, languages, person in sorted(rows, key=lambda row: row[0].lower()):
            linked = f'[@{login}](https://github.com/{login})' if person.get('login') or role != 'former' else safe(login)
            lines.append(f"| {linked} | {', '.join(map(safe, languages)) or '—'} | {person.get('commits', 0):,} | +{person.get('added', 0):,} | -{person.get('removed', 0):,} |")
        lines += ['']
    return '\n'.join(lines).rstrip()


def generate():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if block is stale; never write README')
    parser.add_argument('--report', type=Path, help='Write audit JSON outside the committed tree')
    args = parser.parse_args()
    started = time.monotonic()
    readme = Path('README.md')
    original = readme.read_bytes()
    rewrite(original, '')  # Fail closed before any network calls or writes.
    if command('git', 'rev-parse', '--is-shallow-repository').strip() != b'false':
        raise ValueError('Full history is required')
    users = json.loads(command('git', 'show', 'refs/remotes/origin/editor-data:config/permissions.json'))['users']
    exclusions = json.loads(Path('scripts/contributors-exclusions.json').read_text())
    # Include every branch and archived tag; git log visits each SHA only once.
    refs = command('git', 'for-each-ref', '--format=%(refname)', 'refs/remotes/origin/').decode().splitlines()
    refs = [ref for ref in refs if ref != 'refs/remotes/origin/HEAD']
    refs += command('git', 'for-each-ref', '--format=%(refname)', 'refs/tags/').decode().splitlines() + ['HEAD']
    history = command('git', 'log', '--no-renames', '--numstat', '-z',
                      '--format=%x00COMMIT%x00%H%x00%an%x00%ae%x00', *refs)
    people = {}
    unmatched = defaultdict(lambda: {'commits': 0, 'added': 0, 'removed': 0})
    records = history.split(b'\x00COMMIT\x00')[1:]
    authors = api_authors([record.split(b'\x00', 1)[0].decode() for record in records])
    bots = 0
    for record in records:
        sha, name, email, changes = record.split(b'\x00', 3)
        sha, name, email = (x.decode('utf-8', 'replace') for x in (sha, name, email))
        # API failures abort instead of silently dropping people.
        login, bot = identity(name, email, authors[sha])
        if bot:
            bots += 1
            continue
        raw_added = raw_removed = added = removed = 0
        for change in changes.split(b'\x00'):
            if not change.strip():
                continue
            a, r, path = change.lstrip(b'\n').split(b'\t', 2)
            if a == b'-':  # Binary files have no line counts.
                continue
            a, r = int(a), int(r)
            raw_added += a
            raw_removed += r
            if not any(fnmatch.fnmatchcase(path.decode('utf-8', 'replace'), entry['path']) for entry in exclusions):
                added += a
                removed += r
        if not login:
            unknown = unmatched[f'{name} <{email}>']
            unknown['commits'] += 1
            unknown['added'] += added
            unknown['removed'] += removed
            # Only conventional multiword personal names are safe to display;
            # machine-like or ambiguous handles remain audit-only, without guessing.
            if not re.fullmatch(r"[^\W\d_]+(?:[ '-][^\W\d_]+)+", name, re.UNICODE):
                continue
        key = login.lower() if login else 'unmatched:' + name + ':' + email
        person = people.setdefault(key, dict(login=login, label=login or name, commits=0,
                                             added=0, removed=0, raw_added=0, raw_removed=0))
        for field, count in [('commits', 1), ('added', added), ('removed', removed),
                             ('raw_added', raw_added), ('raw_removed', raw_removed)]:
            person[field] += count
    updated = rewrite(original, render(users, people))
    audit = dict(seconds=round(time.monotonic() - started, 3), people=people,
                 unmatched=dict(unmatched), excluded_bot_commits=bots,
                 commits_scanned=len(records), permissions_ref=command('git', 'rev-parse', 'origin/editor-data').decode().strip())
    if args.report:
        args.report.write_text(json.dumps(audit, indent=2) + '\n', encoding='utf-8')
    print(f"{len(people)} people; {bots} bot commits excluded; {len(unmatched)} unmatched identities; {audit['seconds']} seconds")
    if args.check and updated != original:
        raise SystemExit('Contributors block is stale')
    if not args.check and updated != original:
        readme.write_bytes(updated)


if __name__ == '__main__':
    generate()
