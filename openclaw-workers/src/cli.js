#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadSchema, validateBasic } from './schema-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const WORKERS = [
  'creative-partner',
  'content-producer', 
  'repurposing',
  'qa-guardrail',
  'publishing-ops',
  'weekly-feedback'
];

function showHelp() {
  console.log(`
openclaw-workers CLI

Usage:
  node src/cli.js --list                    List all workers
  node src/cli.js --worker <name> --prompt  Show worker prompt template
  node src/cli.js --worker <name> --run     Run worker with stdin JSON
  node src/cli.js --schema <name>           Show JSON schema for worker I/O
  node src/cli.js --example <name>          Show example input/output
  node src/cli.js --validate --worker <name> --input <path>
                                          Validate JSON file against worker output schema

Workers:
  ${WORKERS.join('\n  ')}

Examples:
  node src/cli.js --worker creative-partner --prompt
  cat examples/creative-partner-input.json | node src/cli.js --worker creative-partner --run
`);
}

function listWorkers() {
  console.log('Available workers:');
  WORKERS.forEach(w => {
    const path = join(ROOT, 'workers', `${w}.md`);
    const exists = existsSync(path);
    console.log(`  ${exists ? '✓' : '✗'} ${w}`);
  });
}

function showPrompt(worker) {
  const path = join(ROOT, 'workers', `${worker}.md`);
  if (!existsSync(path)) {
    console.error(`Worker not found: ${worker}`);
    process.exit(1);
  }
  const content = readFileSync(path, 'utf-8');
  
  // Extract prompt section
  const match = content.match(/## Prompt[\s\S]*?(?=##|$)/);
  if (match) {
    console.log(match[0].trim());
  } else {
    console.log(content);
  }
}

function showSchema(name) {
  const path = join(ROOT, 'schemas', `${name}.json`);
  if (!existsSync(path)) {
    console.error(`Schema not found: ${name}`);
    process.exit(1);
  }
  console.log(readFileSync(path, 'utf-8'));
}

function validateFile(worker, inputPath) {
  if (!inputPath) {
    console.error('Missing --input <path>');
    process.exit(1);
  }

  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const schemaName = `${worker}-output`;
  const schema = loadSchema(schemaName);
  const data = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const errors = validateBasic(schema, data);

  if (errors.length === 0) {
    console.log(`PASS: ${inputPath} matches ${schemaName}.json`);
    return;
  }

  console.log(`FAIL: ${inputPath} has ${errors.length} issue(s)`);
  errors.forEach(e => console.log(`- ${e}`));
  process.exit(1);
}

function showExample(name) {
  const inputPath = join(ROOT, 'examples', `${name}-input.json`);
  const outputPath = join(ROOT, 'examples', `${name}-output.json`);
  
  console.log('--- INPUT ---');
  if (existsSync(inputPath)) {
    console.log(readFileSync(inputPath, 'utf-8'));
  } else {
    console.log('(no input example)');
  }
  
  console.log('\n--- OUTPUT ---');
  if (existsSync(outputPath)) {
    console.log(readFileSync(outputPath, 'utf-8'));
  } else {
    console.log('(no output example)');
  }
}

async function runWorker(worker) {
  const path = join(ROOT, 'workers', `${worker}.md`);
  if (!existsSync(path)) {
    console.error(`Worker not found: ${worker}`);
    process.exit(1);
  }

  // Read stdin
  let input = '';
  process.stdin.setEncoding('utf-8');
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(input || '{}');
  } catch (e) {
    console.error('Invalid JSON input:', e.message);
    process.exit(1);
  }

  // Load worker spec
  const spec = readFileSync(path, 'utf-8');
  
  // For dry-run, just echo what would happen
  console.log(JSON.stringify({
    worker,
    status: 'dry-run',
    received: payload,
    note: 'This is a local dry-run. In production, this would call the LLM with the prompt template.',
    prompt_preview: spec.substring(0, 500) + '...'
  }, null, 2));
}

// Parse args
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--list')) {
  listWorkers();
  process.exit(0);
}

if (args.includes('--worker')) {
  const idx = args.indexOf('--worker');
  const worker = args[idx + 1];
  
  if (!worker || !WORKERS.includes(worker)) {
    console.error(`Unknown worker: ${worker}`);
    console.error(`Valid workers: ${WORKERS.join(', ')}`);
    process.exit(1);
  }
  
  if (args.includes('--prompt')) {
    showPrompt(worker);
  } else if (args.includes('--run')) {
    await runWorker(worker);
  } else if (args.includes('--validate')) {
    const inputIdx = args.indexOf('--input');
    validateFile(worker, inputIdx >= 0 ? args[inputIdx + 1] : null);
  } else {
    console.error('Specify --prompt, --run, or --validate --input <path>');
    process.exit(1);
  }
  process.exit(0);
}

if (args.includes('--schema')) {
  const idx = args.indexOf('--schema');
  showSchema(args[idx + 1]);
  process.exit(0);
}

if (args.includes('--example')) {
  const idx = args.indexOf('--example');
  showExample(args[idx + 1]);
  process.exit(0);
}

console.error('Unknown command. Use --help for usage.');
process.exit(1);
