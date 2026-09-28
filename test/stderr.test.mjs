import assert from 'node:assert/strict';
import { test } from 'node:test';

const record = {
  schema: 'logslines/v1',
  timestamp: '2026-09-27T04:30:00.000Z',
  level: 'info',
  event: 'memory.retained',
  message: 'Memory retained',
  service: { namespace: 'openlines', name: 'nanomneme', component: 'nmnm-pi', version: '0.2.1' },
  context: { session_id: null },
  operation: 'retain',
  status: 'ok',
  duration_ms: null,
  attributes: {},
  error: null,
};

test('writes exactly one serialized JSON record and newline', async () => {
  const { createStderrSink } = await import('../src/index.js');
  assert.equal(typeof createStderrSink, 'function');

  const chunks = [];
  const sink = createStderrSink({
    stream: {
      write(chunk) {
        chunks.push(String(chunk));
        return true;
      },
    },
  });

  assert.equal(sink(record), true);
  assert.deepEqual(chunks, [`${JSON.stringify(record)}\n`]);
});

test('treats writable backpressure as a successful write', async () => {
  const { createStderrSink } = await import('../src/index.js');
  assert.equal(typeof createStderrSink, 'function');

  const sink = createStderrSink({ stream: { write: () => false } });
  assert.equal(sink(record), true);
});

test('returns false when serialization or a synchronous write fails', async () => {
  const { createStderrSink } = await import('../src/index.js');
  assert.equal(typeof createStderrSink, 'function');

  const sink = createStderrSink({
    stream: { write() { throw new Error('stream unavailable'); } },
  });
  assert.equal(sink(record), false);

  const cyclic = { ...record };
  cyclic.self = cyclic;
  assert.equal(sink(cyclic), false);
});

test('logger uses the default stderr sink when no sink is provided', async () => {
  const { createLogger } = await import('../src/index.js');
  const chunks = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = function (chunk) {
    chunks.push(String(chunk));
    return true;
  };

  try {
    const logger = createLogger({
      service: { namespace: 'openlines', name: 'nanomneme', component: 'nmnm-pi', version: '0.2.1' },
      now: () => new Date('2026-09-27T04:30:00.000Z'),
    });
    assert.equal(logger.emit({
      context: { session_id: null },
      level: 'info',
      event: 'memory.retained',
      message: 'Memory retained',
      operation: 'retain',
      status: 'ok',
      duration_ms: null,
      attributes: {},
      error: null,
    }), true);
    assert.match(chunks[0], /^\{"schema":"logslines\/v1".*\}\n$/);
  } finally {
    process.stderr.write = originalWrite;
  }
});
