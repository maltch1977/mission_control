#!/usr/bin/env node

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadSchema, validateBasic } from '../src/schema-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXAMPLES = join(ROOT, 'examples');

const files = readdirSync(EXAMPLES).filter(f => f.endsWith('-output.json'));
let failures = 0;

for (const file of files) {
  const worker = file.replace('-output.json', '');
  const schema = loadSchema(`${worker}-output`);
  const payload = JSON.parse(readFileSync(join(EXAMPLES, file), 'utf-8'));
  const errors = validateBasic(schema, payload);

  if (errors.length === 0) {
    console.log(`PASS ${file}`);
    continue;
  }

  failures++;
  console.log(`FAIL ${file}`);
  errors.forEach(e => console.log(`  - ${e}`));
}

if (failures > 0) {
  console.error(`\nValidation failed for ${failures} file(s).`);
  process.exit(1);
}

console.log('\nAll example outputs passed schema checks.');
