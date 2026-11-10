import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { PEOPLE_TTL_MS, ROLES, forgetPeople, loadPeople, peopleByRole, personByEmail, tidyPeople } from './people.js';

const ROWS = [
  { UserID: 'U3', UserName: 'Zoe Weber', UserEMailID: 'zoe@x.example', role: 'Regular User' },
  { UserID: 'U1', UserName: 'Ana Lopez', UserEMailID: 'Ana@x.example', role: 'Admin' },
  { UserID: 'U2', UserName: 'Ben Shah', UserEMailID: 'ben@x.example' },
  { UserID: 'U4', UserName: 'Gone Person', UserEMailID: 'gone@x.example', active: false },
  { UserName: 'No id' },
  null,
];

beforeEach(() => forgetPeople());

test('tidyPeople: real, active rows only, by name', () => {
  assert.deepEqual(tidyPeople(ROWS).map((p) => p.UserID), ['U1', 'U2', 'U3']);
  assert.deepEqual(tidyPeople(null), []);
});

test('loadPeople: one request within the time to live, another after it', async () => {
  let calls = 0;
  const list = async () => {
    calls += 1;
    return ROWS;
  };
  const first = await loadPeople({ list, now: 1000 });
  assert.equal(first.length, 3);
  assert.equal(await loadPeople({ list, now: 1000 + PEOPLE_TTL_MS - 1 }), first);
  assert.equal(calls, 1);
  await loadPeople({ list, now: 1000 + PEOPLE_TTL_MS });
  assert.equal(calls, 2);
  await loadPeople({ list, now: 1000 + PEOPLE_TTL_MS, force: true });
  assert.equal(calls, 3);
});

test('loadPeople: callers at the same moment share one request', async () => {
  let calls = 0;
  const list = () => new Promise((resolve) => setTimeout(() => resolve(ROWS), 5, (calls += 1)));
  const [a, b] = await Promise.all([loadPeople({ list }), loadPeople({ list })]);
  assert.equal(calls, 1);
  assert.equal(a, b);
});

test('loadPeople: a failure is not remembered', async () => {
  await assert.rejects(loadPeople({ list: () => Promise.reject(new Error('down')) }));
  assert.equal((await loadPeople({ list: async () => ROWS })).length, 3);
});

test('peopleByRole: each role has its people; anyone can be a Regular User', () => {
  const by = peopleByRole(tidyPeople(ROWS));
  assert.deepEqual(Object.keys(by), [...ROLES]);
  assert.deepEqual(by.Admin.map((p) => p.UserID), ['U1']);
  assert.deepEqual(by['Regular User'].map((p) => p.UserID), ['U1', 'U2', 'U3']);
  assert.deepEqual(by.GMT, []);
  assert.deepEqual(peopleByRole([{ UserID: 'U9', UserEMailID: 'a@b', role: 'Wizard' }]).Admin, []);
});

test('personByEmail ignores letter case and blanks', () => {
  const people = tidyPeople(ROWS);
  assert.equal(personByEmail(people, ' ANA@x.example ').UserID, 'U1');
  assert.equal(personByEmail(people, ''), undefined);
  assert.equal(personByEmail(people, 'nobody@x.example'), undefined);
});
