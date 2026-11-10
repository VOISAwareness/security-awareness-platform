import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyticsRows } from './campaignResults.js';

test('analyticsRows: the API rows in the pop-up shape; a click is "trapped"', () => {
  const rows = analyticsRows([
    { recipientEmail: 'Ana@X.example', recipientName: 'Ana', department: 'AIDA', country: 'Spain',
      opened: true, clicked: true, compromised: true, trained: false, reported: false },
    { recipientEmail: 'ben@x.example', opened: true, reported: true },
    { recipientName: 'no email' },
    null,
  ]);
  assert.deepEqual(rows, [
    { email: 'ana@x.example', name: 'Ana', country: 'Spain', department: 'AIDA',
      opened: true, trapped: true, compromised: true, trained: false, reported: false },
    { email: 'ben@x.example', name: '', country: 'Unknown', department: 'Unknown',
      opened: true, trapped: false, compromised: false, trained: false, reported: true },
  ]);
  assert.deepEqual(analyticsRows(undefined), []);
});
