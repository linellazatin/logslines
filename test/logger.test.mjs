import assert from 'node:assert/strict';
import { test } from 'node:test';

async function loadLogger(t) {
  try {
    return await import('../src/index.js');
  } catch (error) {
    assert.fail(`logger export is not implemented: ${error.message}`);
  }
}

const service = {
  namespace: 'openlines',
  name: 'nanomneme',
  component: 'nmnm-pi',
  version: '0.2.1',
};

const validInput = {
  context: { session_id: 'host-session-123' },
  level: 'info',
  event: 'memory.retained',
  message: 'Memory retained',
  operation: 'retain',
  status: 'ok',
  duration_ms: 6.42,
  attributes: { 'memory.scope': 'project' },
  error: null,
};

test('emits the exact closed envelope and uses the injected UTC clock', async (t) => {
  const { createLogger } = await loadLogger(t);
  const records = [];
  const logger = createLogger({
    service,
    sink: (record) => records.push(record),
    now: () => new Date('2026-09-27T04:30:00.000Z'),
  });

  assert.equal(logger.emit(validInput), true);
  assert.deepEqual(records, [{
    schema: 'logslines/v1',
    timestamp: '2026-09-27T04:30:00.000Z',
    level: 'info',
    event: 'memory.retained',
    message: 'Memory retained',
    service,
    context: { session_id: 'host-session-123' },
    operation: 'retain',
    status: 'ok',
    duration_ms: 6.42,
    attributes: { 'memory.scope': 'project' },
    error: null,
  }]);
  assert.deepEqual(Object.keys(records[0]), [
    'schema', 'timestamp', 'level', 'event', 'message', 'service', 'context',
    'operation', 'status', 'duration_ms', 'attributes', 'error',
  ]);
});

test('emits failed records with a closed normalized error object', async (t) => {
  const { createLogger } = await loadLogger(t);
  const records = [];
  const logger = createLogger({
    service,
    sink: (record) => records.push(record),
    now: () => new Date('2026-09-27T04:30:00Z'),
  });

  assert.equal(logger.emit({
    ...validInput,
    context: { session_id: null },
    status: 'failed',
    error: {
      kind: 'configuration',
      code: 'invalid_settings',
      message: 'Settings could not be loaded',
      retryable: false,
    },
  }), true);
  assert.equal(records[0].status, 'failed');
  assert.deepEqual(records[0].error, {
    kind: 'configuration',
    code: 'invalid_settings',
    message: 'Settings could not be loaded',
    retryable: false,
  });
});

test('rejects status/error mismatches without sending a record', async (t) => {
  const { createLogger } = await loadLogger(t);
  const records = [];
  const logger = createLogger({ service, sink: (record) => records.push(record) });

  assert.equal(logger.emit({ ...validInput, status: 'failed', error: null }), false);
  assert.equal(logger.emit({
    ...validInput,
    error: { kind: 'configuration', code: 'bad_settings', message: 'Bad settings', retryable: false },
  }), false);
  assert.equal(records.length, 0);
});

test('returns false instead of throwing when a sink fails', async (t) => {
  const { createLogger } = await loadLogger(t);
  const logger = createLogger({
    service,
    sink: () => { throw new Error('sink unavailable'); },
  });

  assert.doesNotThrow(() => {
    assert.equal(logger.emit(validInput), false);
  });
});

test('rejects sparse attribute arrays instead of serializing holes as null', async (t) => {
  const { createLogger } = await loadLogger(t);
  const logger = createLogger({ service, sink: () => true });
  const values = ['first', , 'third'];

  assert.equal(logger.emit({ ...validInput, attributes: { 'item.values': values } }), false);
});

test('returns false when a malformed input throws during validation', async (t) => {
  const { createLogger } = await loadLogger(t);
  const logger = createLogger({ service, sink: () => true });
  const input = new Proxy(validInput, {
    get() {
      throw new Error('input getter failed');
    },
  });

  assert.doesNotThrow(() => {
    assert.equal(logger.emit(input), false);
  });
});
