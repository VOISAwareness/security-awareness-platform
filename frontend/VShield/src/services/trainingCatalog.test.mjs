import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  CATALOG_TTL_MS, byId, deleteTraining, forServer, forgetTraining, loadTraining, saveTraining, trainingSnapshot,
} from './trainingCatalog.js';

function fakeClient(rows = {}) {
  const calls = [];
  const lists = { paths: [], videos: [], quizzes: [], certificates: [], ...rows };
  const client = { calls };
  for (const kind of Object.keys(lists)) {
    client[kind] = async () => {
      calls.push(['list', kind]);
      return lists[kind];
    };
  }
  client.save = async (kind, id, row) => {
    calls.push(['save', kind, id, row]);
    return { ...row, ModifiedAt: 'now' };
  };
  client.remove = async (kind, id) => calls.push(['remove', kind, id]);
  return client;
}

beforeEach(() => forgetTraining());

test('loadTraining: all four lists, sorted by ID, one read within the time to live', async () => {
  const client = fakeClient({ paths: [{ TrainingPathID: 'TP-00010' }, { TrainingPathID: 'TP-00002' }] });
  const catalog = await loadTraining({ client, now: 1000 });
  assert.deepEqual(catalog.paths.map((p) => p.TrainingPathID), ['TP-00002', 'TP-00010']);
  assert.deepEqual(catalog.videos, []);
  await loadTraining({ client, now: 1000 + CATALOG_TTL_MS - 1 });
  assert.equal(client.calls.length, 4);
  assert.equal(trainingSnapshot(), catalog);
});

test('loadTraining: a failure is not remembered; the snapshot stays empty', async () => {
  const client = fakeClient();
  client.videos = async () => {
    throw new Error('down');
  };
  await assert.rejects(loadTraining({ client }));
  assert.deepEqual(trainingSnapshot().paths, []);
  assert.equal((await loadTraining({ client: fakeClient() })).quizzes.length, 0);
});

test('saveTraining sends the row without blob: URLs and updates the shared copy', async () => {
  const client = fakeClient({ videos: [{ TrainingVideoID: 'TV-2', TrainingVideoName: 'old' }] });
  await loadTraining({ client });
  await saveTraining('videos', { TrainingVideoID: 'TV-2', TrainingVideoName: 'new', TrainingVideo: 'blob:http://x/1' }, { client });
  await saveTraining('videos', { TrainingVideoID: 'TV-1', TrainingVideoName: 'first' }, { client });
  const [, , id, sent] = client.calls.find((c) => c[0] === 'save');
  assert.equal(id, 'TV-2');
  assert.deepEqual(sent, { TrainingVideoID: 'TV-2', TrainingVideoName: 'new' });
  assert.deepEqual(trainingSnapshot().videos.map((v) => [v.TrainingVideoID, v.TrainingVideoName]), [['TV-1', 'first'], ['TV-2', 'new']]);
  await assert.rejects(saveTraining('videos', { TrainingVideoName: 'no id' }, { client }), /TrainingVideoID is required/);
});

test('deleteTraining removes it on the server and from the shared copy', async () => {
  const client = fakeClient({ quizzes: [{ TrainingQuizID: 'TQ-1' }, { TrainingQuizID: 'TQ-2' }] });
  await loadTraining({ client });
  await deleteTraining('quizzes', 'TQ-1', { client });
  assert.deepEqual(client.calls.at(-1), ['remove', 'quizzes', 'TQ-1']);
  assert.deepEqual(trainingSnapshot().quizzes.map((q) => q.TrainingQuizID), ['TQ-2']);
});

test('forServer and byId', () => {
  assert.deepEqual(forServer({ a: 'blob:x', b: 'https://x', c: 1 }), { b: 'https://x', c: 1 });
  assert.deepEqual(forServer(null), {});
  const rows = [{ TrainingQuizID: 'TQ-10' }, { TrainingQuizID: 'TQ-9' }];
  assert.deepEqual(rows.sort(byId('quizzes')).map((r) => r.TrainingQuizID), ['TQ-9', 'TQ-10']);
});
