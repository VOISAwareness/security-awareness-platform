import assert from 'node:assert/strict';
import test from 'node:test';
import { Mail } from 'lucide-react';

import { lureIcon } from './lureIcons.js';
import { typeShort } from '../../services/campaignTypes.js';
import { EMAIL_TYPES } from '../../services/scenarioOptions.js';

test('each type of email has its own icon and a short name; any other name an envelope', () => {
  const icons = EMAIL_TYPES.map((t) => lureIcon(t.label));
  assert.ok(icons.every((icon) => icon && icon !== Mail));
  assert.equal(new Set(icons).size, EMAIL_TYPES.length);
  assert.equal(lureIcon('Custom'), Mail);
  assert.equal(lureIcon(undefined), Mail);
  assert.equal(typeShort('Payment / Transaction'), 'Payment');
});
