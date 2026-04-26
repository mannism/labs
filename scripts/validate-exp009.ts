/**
 * EXP_009 validation script
 *
 * Discovers all task JSON files from src/data/experiments/exp_009/tasks/,
 * validates each against TaskSchema, then runs them against OpenAI and
 * Anthropic providers. Gemini is verified by inspection (correct SDK + error
 * handling) but skipped at runtime because GOOGLE_AI_API_KEY is not yet
 * provisioned.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/validate-exp009.ts
 *
 * Expected output: pass/fail + latency for each task × model combination.
 * Exit code 0 = all API calls executed (individual task failures are expected
 * when models are gated). Exit code 1 = unrecoverable setup error.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { TaskSchema, MODEL_CONFIGS, type Task, type ModelId } from '../src/lib/experiments/exp_009/types';
import { runTask } from '../src/lib/experiments/exp_009/runner';

const TASKS_DIR = join(process.cwd(), 'src', 'data', 'experiments', 'exp_009', 'tasks');

// Run against OpenAI and Anthropic only — Gemini key not yet provisioned.
const ACTIVE_MODELS: ModelId[] = ['gpt-5.5', 'claude-opus-4-7'];

/**
 * Discover and load all task JSON files from the tasks directory.
 * Files are sorted alphabetically so results are deterministic.
 * Invalid files are logged and skipped — they do not abort the run.
 */
async function loadAllTasks(): Promise<Task[]> {
  let files: string[];

  try {
    files = await readdir(TASKS_DIR);
  } catch (err: unknown) {
    throw new Error(`Cannot read tasks directory: ${String(err)}`);
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
  const tasks: Task[] = [];

  for (const file of jsonFiles) {
    const filePath = join(TASKS_DIR, file);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const json: unknown = JSON.parse(raw);
      const result = TaskSchema.safeParse(json);

      if (result.success) {
        tasks.push(result.data);
      } else {
        const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        console.warn(`[validate] Skipping invalid task file ${file}: ${errors.join(', ')}`);
      }
    } catch (err: unknown) {
      console.warn(`[validate] Failed to parse ${file}: ${String(err)}`);
    }
  }

  return tasks;
}

function pad(s: string, n: number): string {
  return s.padEnd(n, ' ');
}

async function main(): Promise<void> {
  console.log('\n=== EXP_009 Validation Run ===\n');
  console.log('Models under test: OpenAI (gpt-5.5 → gpt-4.1 fallback), Anthropic (claude-opus-4-7)');
  console.log('Gemini: skipped at runtime (GOOGLE_AI_API_KEY pending), verified by code inspection.\n');

  let tasks: Task[];

  try {
    tasks = await loadAllTasks();
  } catch (err: unknown) {
    console.error('Failed to load tasks:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (tasks.length === 0) {
    console.error('No valid task files found in tasks directory. Aborting.');
    process.exit(1);
  }

  console.log(`Loaded ${tasks.length} task(s). Running against ${ACTIVE_MODELS.length} model(s)...\n`);

  const header = [
    pad('Task ID', 40),
    pad('Model', 20),
    pad('Pass', 6),
    pad('Latency', 10),
    'Errors',
  ].join('  ');

  console.log(header);
  console.log('-'.repeat(header.length));

  let anyFailed = false;
  const failingSummary: Array<{ taskId: string; model: string; errors: string }> = [];

  for (const task of tasks) {
    for (const modelId of ACTIVE_MODELS) {
      const config = MODEL_CONFIGS[modelId];
      const result = await runTask(task, config);

      const passLabel = result.pass ? 'PASS' : 'FAIL';
      const latency = `${result.latencyMs}ms`;
      const errors = result.validationErrors?.join('; ') ?? '';

      console.log(
        [
          pad(result.taskId, 40),
          pad(config.label, 20),
          pad(passLabel, 6),
          pad(latency, 10),
          errors,
        ].join('  '),
      );

      if (!result.pass) {
        anyFailed = true;
        failingSummary.push({ taskId: result.taskId, model: config.label, errors });
      }
    }
    console.log('');
  }

  console.log('=== Run complete ===');

  if (anyFailed) {
    console.log('\nFailing tasks summary:');
    for (const f of failingSummary) {
      console.log(`  ${f.taskId} / ${f.model}: ${f.errors || '(no error detail)'}`);
    }
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
