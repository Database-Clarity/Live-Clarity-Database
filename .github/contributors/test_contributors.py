import json
from pathlib import Path
import unittest

from contributors import identity, render, rewrite, role_groups, START, END


class ContributorsTest(unittest.TestCase):
    def test_rewrite_preserves_every_outside_byte(self):
        prefix, suffix = b'\xef\xbb\xbfOld\r\n' + START, END + b'\r\nTail\x00'
        original = prefix + b'\r\nold table\r\n' + suffix
        actual = rewrite(original, 'new table')
        self.assertEqual(actual, prefix + b'\nnew table\n' + suffix)
        self.assertEqual(rewrite(actual, 'new table'), actual)

    def test_invalid_markers_fail_closed(self):
        for content in (b'', START, END, END + START, START + START + END, START + END + END):
            with self.subTest(content=content), self.assertRaises(ValueError):
                rewrite(content, 'anything')

    def test_identity_fixtures(self):
        fixtures = json.loads((Path(__file__).parent / 'contributors-fixtures.json').read_text())
        for fixture in fixtures:
            with self.subTest(fixture=fixture):
                self.assertEqual(identity(fixture['name'], fixture['email'], fixture['api']),
                                 (fixture['login'], fixture['bot']))

    def test_roles_zero_counts_former_languages_and_case(self):
        users = {'1': {'login': 'Alice', 'role': 'maintainer'},
                 '2': {'login': 'Bob', 'role': 'translator', 'languages': ['de', 'fr']},
                 '3': {'login': 'Eve', 'role': 'editor'},
                 '4': {'login': 'New', 'role': 'trial'}}
        people = {'alice': {'login': 'Alice', 'label': 'Alice', 'commits': 2, 'added': 10, 'removed': 3},
                  'old': {'login': 'Old', 'label': 'Old', 'commits': 1}}
        groups = role_groups(users, people)
        self.assertEqual([row[0] for row in groups['former']], ['Old'])
        self.assertEqual(groups['translator'][0][1], ['de', 'fr'])
        text = render(users, people)
        self.assertIn('https://github.com/Bob.png?size=64', text)
        self.assertIn('alt="@Bob"', text)
        self.assertIn('0 commits<br>+0 / -0<br>Languages: de, fr', text)
        self.assertIn('2 commits<br>+10 / -3', text)
        self.assertIn('### Trials', text)
        with self.assertRaises(ValueError):
            role_groups({'5': {'login': 'What', 'role': 'unknown'}}, {})

    def test_grid_rows_and_unmatched_name_escaping(self):
        people = {str(i): {'label': f'Person {i}', 'commits': i} for i in range(5)}
        people['0']['label'] = 'Person <script>'
        text = render({}, people)
        self.assertEqual(text.count('<tr>'), 2)
        self.assertEqual(text.count('</tr>'), 2)
        self.assertEqual(text.count('<td align="center">'), 5)
        self.assertIn('Person &lt;script&gt;', text)
        self.assertNotIn('<script>', text)


if __name__ == '__main__':
    unittest.main()
