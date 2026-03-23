#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadSchema, validateBasic } from './schema-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const FLOW = [
  'creative-partner',
  'content-producer',
  'qa-guardrail',
  'repurposing',
  'publishing-ops',
  'weekly-feedback'
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    pipelineId: getArg(args, '--pipeline-id') || `pipeline-${Date.now()}`,
    strict: args.includes('--strict')
  };
}

function getArg(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

function loadExample(worker, kind) {
  const path = join(ROOT, 'examples', `${worker}-${kind}.json`);
  if (!existsSync(path)) {
    throw new Error(`Missing example file: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function validateWorkerOutput(worker, output) {
  const schemaName = `${worker}-output`;
  const schema = loadSchema(schemaName);
  return validateBasic(schema, output);
}

function buildHandoff(worker, nextWorker, output, pipelineId) {
  return {
    handoff: {
      from: worker,
      to: nextWorker,
      timestamp: new Date().toISOString(),
      pipeline_id: pipelineId
    },
    payload: output,
    context: {
      original_request: 'pipeline simulation from examples',
      priority: 'normal'
    }
  };
}

function main() {
  const { pipelineId, strict } = parseArgs();
  const report = {
    pipeline_id: pipelineId,
    flow: FLOW,
    steps: [],
    ok: true
  };

  for (let i = 0; i < FLOW.length; i++) {
    const worker = FLOW[i];
    const nextWorker = FLOW[i + 1] || 'creative-partner';

    const output = loadExample(worker, 'output');
    const errors = validateWorkerOutput(worker, output);

    const handoff = buildHandoff(worker, nextWorker, output, pipelineId);
    const handoffErrors = validateBasic(loadSchema('handoff'), handoff);

    const step = {
      worker,
      next: nextWorker,
      output_valid: errors.length === 0,
      handoff_valid: handoffErrors.length === 0,
      errors: [...errors, ...handoffErrors]
    };

    if (step.errors.length > 0) {
      report.ok = false;
    }

    report.steps.push(step);

    if (strict && step.errors.length > 0) {
      console.error(JSON.stringify(report, null, 2));
      process.exit(1);
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();
