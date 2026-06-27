// Lightweight unit tests using the built-in node:test runner (no extra deps).
// Run with:  npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { extractTicket } from '../src/integrations/jira.js';
import { checkTestsAdded } from '../src/core/testCheck.js';

test('extractTicket finds a Jira id in a branch name', () => {
  assert.equal(extractTicket('feature/PROJ-42-google-login'), 'PROJ-42');
  assert.equal(extractTicket('bugfix/ABC123-9-thing'), 'ABC123-9');
});

test('extractTicket returns null when no ticket present', () => {
  assert.equal(extractTicket('feature/google-login'), null);
  assert.equal(extractTicket(''), null);
  assert.equal(extractTicket(undefined), null);
});

test('checkTestsAdded detects test files', () => {
  const files = [
    { filename: 'src/login.js', status: 'modified' },
    { filename: 'src/login.test.js', status: 'added' },
  ];
  const r = checkTestsAdded(files);
  assert.equal(r.hasTests, true);
  assert.equal(r.hasCodeChanges, true);
  assert.deepEqual(r.testFiles, ['src/login.test.js']);
});

test('checkTestsAdded flags code changes without tests', () => {
  const files = [{ filename: 'src/login.js', status: 'modified' }];
  const r = checkTestsAdded(files);
  assert.equal(r.hasTests, false);
  assert.equal(r.hasCodeChanges, true);
});

test('checkTestsAdded recognises python/go/java conventions', () => {
  assert.equal(checkTestsAdded([{ filename: 'test_app.py', status: 'added' }]).hasTests, true);
  assert.equal(checkTestsAdded([{ filename: 'app_test.go', status: 'added' }]).hasTests, true);
  assert.equal(checkTestsAdded([{ filename: 'FooTest.java', status: 'added' }]).hasTests, true);
});
