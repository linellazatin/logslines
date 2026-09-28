import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(await readFile(path.join(root, 'spec/v1/schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const exampleNames = (await readdir(path.join(root, 'examples'))).filter((name) => name.endsWith('.json'));

test('validate command accepts every checked-in Logslines example', () => {
  const result = spawnSync(process.execPath, ['scripts/validate.js'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, new RegExp(`Validated ${exampleNames.length} examples`));
});

test('every checked-in example conforms to the Draft 2020-12 schema', async () => {
  assert.ok(exampleNames.length > 0, 'at least one JSON example must exist');
  for (const name of exampleNames) {
    const record = JSON.parse(await readFile(path.join(root, 'examples', name), 'utf8'));
    assert.equal(validate(record), true, `${name}: ${JSON.stringify(validate.errors)}`);
  }
});

test('schema rejects invalid envelope, status/error, and attribute records', async () => {
  const valid = JSON.parse(await readFile(path.join(root, 'examples/nmnm-pi-ok.json'), 'utf8'));
  const failed = JSON.parse(await readFile(path.join(root, 'examples/nmnm-pi-failed.json'), 'utf8'));
  const invalidRecords = [
    ['missing required duration', Object.fromEntries(Object.entries(valid).filter(([key]) => key !== 'duration_ms'))],
    ['unknown top-level field', { ...valid, extra: true }],
    ['extra service field', { ...valid, service: { ...valid.service, host: 'pi' } }],
    ['extra context field', { ...valid, context: { ...valid.context, trace_id: 'trace' } }],
    ['failed without error', { ...failed, error: null }],
    ['non-failed with error', { ...valid, error: failed.error }],
    ['unknown level', { ...valid, level: 'trace' }],
    ['unknown status', { ...valid, status: 'issues' }],
    ['unknown error kind', { ...failed, error: { ...failed.error, kind: 'conflict' } }],
    ['stack-like cause kind', { ...failed, error: { ...failed.error, cause_kind: 'Error\n    at private/path:1:1' } }],
    ['null attribute', { ...valid, attributes: { 'memory.value': null } }],
    ['nested attribute', { ...valid, attributes: { 'memory.value': { nested: true } } }],
    ['mixed attribute array', { ...valid, attributes: { 'memory.values': ['one', 2] } }],
    ['unnamespaced attribute', { ...valid, attributes: { count: 1 } }],
    ['invalid operation name', { ...valid, operation: 'inject-context' }],
    ['invalid event name', { ...valid, event: 'Memory.Retained' }],
    ['non-UTC timestamp', { ...valid, timestamp: '2026-09-27T04:30:00+08:00' }],
    ['invalid calendar date', { ...valid, timestamp: '2026-02-31T04:30:00Z' }],
    ['missing session id', { ...valid, context: {} }],
  ];

  for (const [label, record] of invalidRecords) {
    assert.equal(validate(record), false, label);
  }
});
