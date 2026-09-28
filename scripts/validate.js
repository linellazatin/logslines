import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(root, 'spec/v1/schema.json');
const examplesPath = path.join(root, 'examples');

async function main() {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const names = (await readdir(examplesPath))
    .filter((name) => name.endsWith('.json'))
    .sort();

  if (names.length === 0) {
    throw new Error(`No JSON examples found in ${path.relative(root, examplesPath)}`);
  }

  const failures = [];
  for (const name of names) {
    const file = path.join(examplesPath, name);
    let record;
    try {
      record = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      failures.push(`${name}: invalid JSON: ${error.message}`);
      continue;
    }

    if (!validate(record)) {
      const details = validate.errors
        .map((error) => `${error.instancePath || '/'} ${error.message}`)
        .join('; ');
      failures.push(`${name}: ${details}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Conformance failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  }

  console.log(`Validated ${names.length} examples against spec/v1/schema.json.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
