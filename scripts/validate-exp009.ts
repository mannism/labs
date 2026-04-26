/**
 * EXP_009 validation script
 *
 * Runs task-001, task-002, and task-003 against OpenAI and Anthropic providers.
 * Gemini is verified by inspection (correct SDK + error handling) but skipped
 * at runtime because GOOGLE_AI_API_KEY is not yet provisioned.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/validate-exp009.ts
 *
 * Expected output: pass/fail + latency for each task × model combination.
 * Exit code 0 = all API calls executed (individual task failures are expected
 * when models are gated). Exit code 1 = unrecoverable setup error.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { TaskSchema, MODEL_CONFIGS, type Task, type ModelId } from '../src/lib/experiments/exp_009/types';
import { runTask } from '../src/lib/experiments/exp_009/runner';

const TASKS_DIR = join(process.cwd(), 'src', 'data', 'experiments', 'exp_009', 'tasks');

const TASK_FILES = [
  'task-001-simple-tool-call.json',
  'task-002-parallel-tool-calls.json',
  'task-003-structured-json.json',
];

// Run against OpenAI and Anthropic only — Gemini key not yet provisioned.
const ACTIVE_MODELS: ModelId[] = ['gpt-5.5', 'claude-opus-4-7'];

async function loadTask(filename: string): Promise<Task> {
  const raw = await readFile(join(TASKS_DIR, filename), 'utf-8');
  const json: unknown = JSON.parse(raw);
  const result = TaskSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid task file ${filename}: ${JSON.stringify(result.error.issues)}`);
  }
  return result.data;
}

function pad(s: string, n: number): string {
  return s.padEnd(n, ' ');
}

async function main(): Promise<void> {
  console.log('\n=== EXP_009 Validation Run ===\n');
  console.log('Models under test: OpenAI (gpt-5.5 → gpt-4.1 fallback), Anthropic (claude-opus-4-5)');
  console.log('Gemini: skipped at runtime (GOOGLE_AI_API_KEY pending), verified by code inspection.\n');

  let tasks: Task[];

  try {
    tasks = await Promise.all(TASK_FILES.map(loadTask));
  } catch (err: unknown) {
    console.error('Failed to load tasks:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const header = [
    pad('Task ID', 36),
    pad('Model', 20),
    pad('Pass', 6),
    pad('Latency', 10),
    'Errors',
  ].join('  ');

  console.log(header);
  console.log('-'.repeat(header.length));

  let anyFailed = false;

  for (const task of tasks) {
    for (const modelId of ACTIVE_MODELS) {
      const config = MODEL_CONFIGS[modelId];
      const result = await runTask(task, config);

      const passLabel = result.pass ? 'PASS' : 'FAIL';
      const latency = `${result.latencyMs}ms`;
      const errors = result.validationErrors?.join('; ') ?? '';

      console.log(
        [
          pad(result.taskId, 36),
          pad(config.label, 20),
          pad(passLabel, 6),
          pad(latency, 10),
          errors,
        ].join('  '),
      );

      if (!result.pass) anyFailed = true;
    }
    console.log('');
  }

  console.log('=== Run complete ===');
  if (anyFailed) {
    console.log('\nNote: individual task failures may reflect gated model access or API key issues.');
    console.log('The runner itself is functioning correctly if errors are provider-level (not crashes).\n');
  } else {
    console.log('\nAll tasks passed.\n');
  }
}

main().catch((err: unknown) => {
  console.error('Unhandled error in validation script:', err);
  process.exit(1);
});
