import assert from 'node:assert/strict';
import { test } from 'node:test';

test('creates a closed error record from explicitly supplied sanitized fields', async () => {
  const { createErrorRecord } = await import('../src/index.js');
  assert.equal(typeof createErrorRecord, 'function');

  assert.deepEqual(createErrorRecord({
    kind: 'network',
    code: 'request_timeout',
    message: 'Content request timed out',
    retryable: true,
    cause_kind: 'AbortError',
  }), {
    kind: 'network',
    code: 'request_timeout',
    message: 'Content request timed out',
    retryable: true,
    cause_kind: 'AbortError',
  });
});

test('does not serialize raw exception messages or stack traces', async () => {
  const { createErrorRecord } = await import('../src/index.js');
  assert.equal(typeof createErrorRecord, 'function');

  const raw = new Error('private prompt text');
  assert.equal(createErrorRecord(raw), null);
  assert.equal(createErrorRecord({
    kind: 'network',
    code: 'request_timeout',
    message: 'Failure',
    retryable: false,
    extra: 'not allowed',
  }), null);
  assert.equal(createErrorRecord({
    kind: 'conflict',
    code: 'bad_code',
    message: 'Failure',
    retryable: false,
  }), null);
});

test('accepts every v1 error kind and rejects incomplete normalized records', async () => {
  const { createErrorRecord } = await import('../src/index.js');
  const kinds = [
    'validation', 'configuration', 'filesystem', 'network', 'provider',
    'protocol', 'platform', 'policy', 'timeout', 'unknown',
  ];

  for (const kind of kinds) {
    assert.equal(createErrorRecord({ kind, code: 'request_failed', message: 'Request failed', retryable: false }).kind, kind);
  }
  assert.equal(createErrorRecord({ kind: 'network', code: 'request_failed', message: 'Request failed' }), null);
});

test('rejects stack-like cause_kind values and throwing input objects', async () => {
  const { createErrorRecord } = await import('../src/index.js');

  assert.equal(createErrorRecord({
    kind: 'unknown',
    code: 'request_failed',
    message: 'Request failed',
    retryable: false,
    cause_kind: 'Error\n    at private/path:1:1',
  }), null);
  assert.doesNotThrow(() => {
    assert.equal(createErrorRecord(new Proxy({}, {
      ownKeys() {
        throw new Error('ownKeys failed');
      },
    })), null);
  });
});
