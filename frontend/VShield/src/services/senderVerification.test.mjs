import assert from 'node:assert/strict';
import test from 'node:test';

import { canSendVerification, isVerifiableEmail, verificationMessage, verificationOf } from './senderVerification.js';

test('only real addresses can be verified, as the API decides', () => {
  assert.ok(isVerifiableEmail('it.alerts@vodafone.com'));
  assert.ok(isVerifiableEmail(' a+b@mail.example.co.uk '));
  assert.ok(!isVerifiableEmail('Spirit_VOIS@domain'));
  assert.ok(!isVerifiableEmail('two@@vodafone.com'));
  assert.ok(!isVerifiableEmail(undefined));
});

test('each SES state reads in the page words', () => {
  assert.equal(verificationOf({ verificationStatus: 'Verified' }).tone, 'good');
  assert.equal(verificationOf({ verificationStatus: 'Pending' }).label, 'Pending');
  assert.equal(verificationOf({}).label, 'Not verified');
  assert.equal(verificationOf({ verificationStatus: 'Unknown' }).label, 'Status unavailable');
});

test('the resend button is for real, unverified addresses', () => {
  assert.ok(canSendVerification({ email: 'a@vodafone.com', verificationStatus: 'Pending' }));
  assert.ok(canSendVerification({ email: 'a@vodafone.com', verificationStatus: 'Failed' }));
  assert.ok(!canSendVerification({ email: 'a@vodafone.com', verificationStatus: 'Verified' }));
  assert.ok(!canSendVerification({ email: 'Spirit_VOIS@domain', verificationStatus: 'Not verified' }));
});

test('after saving: sent, already verified, or why not', () => {
  assert.match(verificationMessage({ email: 'a@x.com', verificationEmailSent: true, verificationStatus: 'Pending' }).text, /sent a verification email to a@x\.com/);
  assert.equal(verificationMessage({ email: 'a@x.com', verificationStatus: 'Verified' }).tone, 'good');
  const no = verificationMessage({ email: 'a@x.com', verificationEmailSent: false, verificationError: 'SES did not send the verification email (AccessDenied)' });
  assert.equal(no.tone, 'bad');
  assert.match(no.text, /AccessDenied/);
});
